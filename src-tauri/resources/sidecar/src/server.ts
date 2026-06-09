import "./process-guard.ts";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { cors } from "hono/cors";
import { bearerAuth } from "hono/bearer-auth";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type { Run } from "@cursor/sdk";
import {
  CursorAgentError,
  createAgentForSessionRecord,
  createEphemeralAgent,
  disposeEphemeralAgent,
  disposeSessionAgent,
  ensureAgentForSession,
  resetAgentsForNotesPath,
  resetSessionAgent,
} from "./agent.ts";
import {
  createApprovalRequest,
  listPendingApprovals,
  resolveApproval,
  waitForApproval,
} from "./approvals.ts";
import { startGoogleCalendarAuth } from "./calendarAuth.ts";
import {
  getAgentProfilePath,
  getCursorApiKey,
  getLinearApiKey,
  getNotesDirOverride,
  getSidecarPort,
  getSidecarToken,
  getUserProfilePath,
  isGoogleCalendarAuthenticated,
  isGoogleCalendarConfigured,
  isWhoopAuthenticated,
  isWhoopConfigured,
} from "./config.ts";
import {
  getModelMode,
  getSelectedModelId,
  resolveSelectedModelName,
  getSelectedModelSelection,
  refreshMaxModelCache,
} from "./models.ts";
import {
  createRunLifecycleEvents,
  createRunState,
  mapSdkMessageToEvents,
} from "./events.ts";
import { resolveLinearIssueAvatars } from "./linearAvatars.ts";
import {
  fetchAllIssuesDueToday,
  isMorningReviewQuickAction,
  resolveMorningReviewDueDate,
} from "./morning-review-linear.ts";
import { prefetchMorningReviewData } from "./morning-review-prefetch.ts";
import { applyMorningReviewDailyNote } from "./daily-note-automation.ts";
import {
  DAILY_NOTE_FOLDER,
  getTodayDailyNote,
  readDailyNoteStats,
} from "./daily-note.ts";
import {
  isGoodMorningFeelQuickAction,
} from "./good-morning.ts";
import {
  buildGoodMorningChatResponse,
  filterUrgentLinearIssues,
} from "./good-morning-response.ts";
import { runGoodMorningFeelFlow } from "./good-morning-feel.ts";
import {
  isGoodNightQuickAction,
  isGoodNightReflectionQuickAction,
  runGoodNightActions,
} from "./good-night.ts";
import { runGoodNightReflectionFlow } from "./good-night-reflection.ts";
import { buildGoodNightChatResponse } from "./good-night-response.ts";
import {
  runGoodMorningDashboardFlow,
  runGoodMorningFeelDashboardFlow,
  runGoodNightDashboardFlow,
  runGoodNightReflectionDashboardFlow,
} from "./dashboard-flows.ts";
import { getMcpServersForSelection } from "./mcp.ts";
import { isDestructiveShellCommand } from "./shell-policy.ts";
import { getWorkspaceCustomTools } from "./workspace-tools.ts";
import { fetchWhoopTodaySnapshot } from "./morning-review-whoop.ts";
import { getWhoopSetupInfo } from "./whoopAuth.ts";
import type { LinearIssueEntity, MarkdownFileEntity, ToolCategory } from "./types.ts";
import { ensureAgentProfile } from "./context/agent.ts";
import { ensureUserProfile, loadUserFirstName, loadUserTimezone } from "./context/profile.ts";
import { augmentUserMessage } from "./prompt.ts";
import { resolveToolSelection, selectTools } from "./tool-routing.ts";
import type { ToolPinSelection } from "./tool-routing.ts";
import { buildUserMessage, resolveMimeType } from "./attachments.ts";
import {
  createSessionRecord,
  DEFAULT_SESSION_TITLE,
  deleteSessionRecord,
  getActiveSessionId,
  getSessionNotesPath,
  listSessions,
  migrateLegacySessionIfNeeded,
  saveSessionState,
  sessionExists,
  setActiveSession,
  updateSessionTitle,
} from "./sessions.ts";
import { loadSettings, saveSettings } from "./store.ts";
import type { AgentEvent, ReadyMessage } from "./types.ts";
import {
  ensureApprovalHooks,
  ensureGitRepo,
  ensureWorkspaceRules,
  getGitDiff,
  getGitStatus,
  prepareWorkspace,
  revertLastChanges,
} from "./workspace.ts";
import {
  DEFAULT_VOICE_ID,
  isTtsAvailable,
  listTtsVoices,
  stopSpeech,
  synthesizeSpeech,
  warmupSpeech,
} from "./tts.ts";
import {
  getSttModelId,
  isSttAvailable,
  isSttReady,
  transcribeAudio,
  warmupStt,
} from "./stt.ts";

const token = getSidecarToken();
const port = getSidecarPort();

function isBenignSdkStreamError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("NGHTTP2_FRAME_SIZE_ERROR") ||
    error.message.includes("ERR_HTTP2_STREAM_ERROR")
  );
}

// process-guard.ts neutralizes phonemizer's re-throwing handlers, so these
// listeners reliably swallow the SDK's benign NGHTTP2 stream rejections.
process.on("unhandledRejection", (reason) => {
  if (isBenignSdkStreamError(reason)) {
    return;
  }
  console.error("[sidecar] Unhandled rejection:", reason);
});

process.on("uncaughtException", (error) => {
  if (isBenignSdkStreamError(error)) {
    return;
  }
  console.error("[sidecar] Uncaught exception:", error);
});

type RunSubscriber = (event: AgentEvent) => void;

interface ActiveRun {
  runId: string;
  subscribers: Set<RunSubscriber>;
  events: AgentEvent[];
  done: boolean;
  state: ReturnType<typeof createRunState>;
  cancelRequested: boolean;
  sdkRun?: Run;
}

const activeRuns = new Map<string, ActiveRun>();
const sessionRunId = new Map<string, string>();

function isTerminalEvent(event: AgentEvent): boolean {
  return (
    event.type === "run.completed" ||
    event.type === "run.failed" ||
    event.type === "startup.failed"
  );
}

function broadcast(runId: string, event: AgentEvent) {
  const run = activeRuns.get(runId);
  if (!run) return;
  run.events.push(event);
  if (isTerminalEvent(event)) {
    run.done = true;
  }
  for (const subscriber of run.subscribers) {
    subscriber(event);
  }
}

function isRunCancelled(runId: string): boolean {
  return activeRuns.get(runId)?.cancelRequested === true;
}

function completeRun(
  runId: string,
  state: ReturnType<typeof createRunState>,
  status: "finished" | "error" | "cancelled",
): void {
  const active = activeRuns.get(runId);
  if (!active || active.done) return;
  for (const event of createRunLifecycleEvents(runId, state, status)) {
    broadcast(runId, event);
  }
}

// Linear assignee avatars require a GraphQL round-trip, so we resolve them off
// the event-streaming path. When they resolve, broadcast a follow-up
// entities.updated so the client backfills avatar URLs without ever blocking
// the agent's message/tool stream.
function scheduleLinearAvatarBackfill(runId: string, event: AgentEvent): void {
  if (event.type !== "entities.created" || event.entityType !== "linear_issue") {
    return;
  }
  const items = event.items as LinearIssueEntity[];
  if (!items.some((item) => item.assigneeId && !item.assigneeAvatarUrl)) {
    return;
  }

  void resolveLinearIssueAvatars(items)
    .then((resolved) => {
      const changed = resolved.some(
        (item, index) => item.assigneeAvatarUrl !== items[index]?.assigneeAvatarUrl,
      );
      if (!changed) return;
      broadcast(runId, {
        type: "entities.updated",
        runId,
        entityType: "linear_issue",
        items: resolved,
      });
    })
    .catch(() => {
      // Avatar enrichment is best-effort; failures leave initials fallback.
    });
}

const app = new Hono();

app.use(
  "*",
  cors({
    // Localhost-only sidecar: reflect the Tauri webview origin (tauri.localhost, etc.).
    origin: (origin) => origin ?? "http://tauri.localhost",
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);

app.use("/flows/*", bearerAuth({ token }));
app.use("/settings", bearerAuth({ token }));
app.use("/sessions/*", bearerAuth({ token }));
app.use("/runs/*", bearerAuth({ token }));
app.use("/approvals/*", bearerAuth({ token }));
app.use("/hooks/*", bearerAuth({ token }));
app.use("/workspace/*", bearerAuth({ token }));
app.use("/tts/*", bearerAuth({ token }));
app.use("/stt/*", bearerAuth({ token }));

app.onError((err, c) => {
  const message = err instanceof Error ? err.message : "Unknown error";
  const status = message === "Unauthorized" ? 401 : 500;
  return c.json({ error: message }, status);
});

app.get("/healthz", (c) => {
  return c.json({
    ok: true,
    hasApiKey: Boolean(getCursorApiKey()),
    hasLinearApiKey: Boolean(getLinearApiKey()),
    hasGoogleCalendarCredentials: isGoogleCalendarConfigured(),
    hasGoogleCalendarAuth: isGoogleCalendarAuthenticated(),
    hasWhoopConfigured: isWhoopConfigured(),
    hasWhoopAuth: isWhoopAuthenticated(),
  });
});

app.post("/integrations/whoop/setup", async (c) => {
  const info = getWhoopSetupInfo();
  return c.json(info);
});

app.get("/whoop/today", async (c) => {
  if (!isWhoopAuthenticated()) {
    return c.json({ authenticated: false, snapshot: null });
  }

  try {
    const snapshot = await fetchWhoopTodaySnapshot({ includeStrainDeepDive: true });
    return c.json({ authenticated: true, snapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Whoop data";
    return c.json({ authenticated: true, snapshot: null, error: message }, 500);
  }
});

app.get("/linear/today", async (c) => {
  const configured = Boolean(getLinearApiKey());
  const dueDate = resolveMorningReviewDueDate();

  if (!configured) {
    return c.json({
      configured: false,
      dueDate,
      issues: [] as LinearIssueEntity[],
    });
  }

  try {
    const issues = await fetchAllIssuesDueToday();

    return c.json({
      configured: true,
      dueDate,
      issues,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Linear issues";
    return c.json(
      {
        configured: true,
        dueDate,
        issues: [] as LinearIssueEntity[],
        error: message,
      },
      500,
    );
  }
});

app.get("/vault/daily-note/today", async (c) => {
  const notesPath = resolveNotesPath();

  try {
    const note = getTodayDailyNote(notesPath, { includeContent: true, createIfMissing: false });
    const stats = note.exists ? readDailyNoteStats(notesPath, note.date) : null;
    const recentNotes = listRecentDailyNotes(notesPath);

    return c.json({ note, stats, recentNotes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load daily note";
    const note = getTodayDailyNote(notesPath, { includeContent: false, createIfMissing: false });
    return c.json({ note, stats: null, recentNotes: [], error: message }, 500);
  }
});

app.post("/flows/good-morning", async (c) => {
  const notesPath = resolveNotesPath();
  if (!existsSync(notesPath)) {
    return c.json({ error: "Notes path does not exist" }, 400);
  }

  try {
    prepareWorkspace(notesPath, port, token);
    const result = await runGoodMorningDashboardFlow(notesPath);
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Good morning flow failed";
    return c.json({ error: message }, 500);
  }
});

app.post("/flows/good-morning/feel", async (c) => {
  const body = (await c.req.json()) as { answer?: string };
  const answer = body.answer?.trim();
  if (!answer) {
    return c.json({ error: "answer is required" }, 400);
  }

  const notesPath = resolveNotesPath();
  if (!existsSync(notesPath)) {
    return c.json({ error: "Notes path does not exist" }, 400);
  }

  prepareWorkspace(notesPath, port, token);
  const settings = loadSettings();
  const model = getSelectedModelSelection(settings);
  const agent = await createEphemeralAgent(notesPath, model);

  try {
    const result = await runGoodMorningFeelDashboardFlow(notesPath, answer, agent);
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Good morning feel failed";
    return c.json({ error: message }, 500);
  } finally {
    await disposeEphemeralAgent(agent);
  }
});

app.post("/flows/good-night", async (c) => {
  const notesPath = resolveNotesPath();
  if (!existsSync(notesPath)) {
    return c.json({ error: "Notes path does not exist" }, 400);
  }

  try {
    prepareWorkspace(notesPath, port, token);
    const result = await runGoodNightDashboardFlow(notesPath);
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Good night flow failed";
    return c.json({ error: message }, 500);
  }
});

app.post("/flows/good-night/reflection", async (c) => {
  const body = (await c.req.json()) as { answers?: string[] };
  if (!Array.isArray(body.answers)) {
    return c.json({ error: "answers is required" }, 400);
  }

  const notesPath = resolveNotesPath();
  if (!existsSync(notesPath)) {
    return c.json({ error: "Notes path does not exist" }, 400);
  }

  prepareWorkspace(notesPath, port, token);
  const settings = loadSettings();
  const model = getSelectedModelSelection(settings);
  const agent = await createEphemeralAgent(notesPath, model);

  try {
    const result = await runGoodNightReflectionDashboardFlow(notesPath, body.answers, agent);
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Good night reflection failed";
    return c.json({ error: message }, 500);
  } finally {
    await disposeEphemeralAgent(agent);
  }
});

app.post("/integrations/google-calendar/connect", async (c) => {
  try {
    const result = await startGoogleCalendarAuth();
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start Google Calendar authentication";
    return c.json({ error: message }, 500);
  }
});

app.get("/settings", async (c) => {
  const settings = loadSettings();
  const modelMode = getModelMode(settings);
  const modelId = getSelectedModelId(settings);
  const modelName = await resolveSelectedModelName(settings);
  return c.json({
    notesPath: settings.notesPath,
    vaultName: settings.vaultName ?? null,
    agentId: settings.agentId,
    modelMode,
    modelId,
    modelName,
    issueLinkMode: settings.issueLinkMode ?? "external",
    defaultModelMode: "auto",
    defaultNotesPath: join(homedir(), "notes"),
    userProfilePath: getUserProfilePath(),
    agentProfilePath: getAgentProfilePath(),
  });
});

app.put("/settings", async (c) => {
  const body = (await c.req.json()) as {
    notesPath?: string;
    vaultName?: string | null;
    modelMode?: string;
    issueLinkMode?: string;
  };
  const notesPath = body.notesPath?.trim();
  const modelMode = body.modelMode?.trim();
  const hasVaultName = body.vaultName !== undefined;
  const hasIssueLinkMode = body.issueLinkMode !== undefined;

  if (!notesPath && !modelMode && !hasVaultName && !hasIssueLinkMode) {
    return c.json({ error: "notesPath, vaultName, modelMode, or issueLinkMode is required" }, 400);
  }

  if (modelMode && modelMode !== "auto" && modelMode !== "max") {
    return c.json({ error: "modelMode must be auto or max" }, 400);
  }

  if (
    hasIssueLinkMode &&
    body.issueLinkMode !== "external" &&
    body.issueLinkMode !== "internal"
  ) {
    return c.json({ error: "issueLinkMode must be external or internal" }, 400);
  }

  const settings = loadSettings();

  if (notesPath) {
    prepareWorkspace(notesPath, port, token);
    settings.notesPath = notesPath;
  }

  if (hasVaultName) {
    const trimmedVaultName = body.vaultName?.trim();
    settings.vaultName = trimmedVaultName || null;
  }

  if (modelMode === "auto" || modelMode === "max") {
    settings.modelMode = modelMode;
    settings.modelId = null;
    if (modelMode === "max") {
      await refreshMaxModelCache();
    }
  }

  if (hasIssueLinkMode) {
    settings.issueLinkMode = body.issueLinkMode === "internal" ? "internal" : "external";
  }

  saveSettings(settings);

  if (notesPath) {
    await resetAgentsForNotesPath();
  } else if (settings.notesPath) {
    await resetAgentsForNotesPath();
  }

  const next = loadSettings();
  const resolvedMode = getModelMode(next);
  const modelName = await resolveSelectedModelName(next);

  return c.json({
    notesPath: next.notesPath,
    vaultName: next.vaultName ?? null,
    agentId: next.notesPath ? next.agentIdByNotesPath[next.notesPath] ?? null : null,
    modelMode: resolvedMode,
    modelId: getSelectedModelId(next),
    modelName,
    issueLinkMode: next.issueLinkMode ?? "external",
  });
});

function resolveNotesPath(): string {
  const settings = loadSettings();
  return settings.notesPath ?? getNotesDirOverride() ?? join(homedir(), "notes");
}

function listRecentDailyNotes(notesPath: string, limit = 7): MarkdownFileEntity[] {
  const dailyDir = join(notesPath, DAILY_NOTE_FOLDER);
  if (!existsSync(dailyDir)) {
    return [];
  }

  return readdirSync(dailyDir)
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.md$/.test(file))
    .sort((left, right) => right.localeCompare(left))
    .slice(0, limit)
    .map((file) => ({
      path: `${DAILY_NOTE_FOLDER}/${file}`,
      title: file.replace(/\.md$/, ""),
    }));
}

app.get("/sessions", (c) => {
  const notesPath = resolveNotesPath();
  migrateLegacySessionIfNeeded(notesPath);

  const sessions = listSessions();
  const activeSessionId = getActiveSessionId() ?? sessions[0]?.sessionId ?? null;

  return c.json({
    activeSessionId,
    sessions,
  });
});

app.post("/sessions", async (c) => {
  const notesPath = resolveNotesPath();

  prepareWorkspace(notesPath, port, token);

  const settings = loadSettings();
  if (!settings.notesPath) {
    settings.notesPath = notesPath;
    saveSettings(settings);
  }

  migrateLegacySessionIfNeeded(notesPath);

  const record = createSessionRecord(notesPath);
  const agent = await createAgentForSessionRecord(record.sessionId, notesPath);

  return c.json({
    sessionId: record.sessionId,
    agentId: agent.agentId,
    notesPath,
    title: record.title,
    messages: record.messages,
    runs: record.runs,
  });
});

app.delete("/sessions/:sessionId", async (c) => {
  const sessionId = c.req.param("sessionId");
  if (!sessionExists(sessionId)) {
    return c.json({ error: "Session not found" }, 404);
  }

  await disposeSessionAgent(sessionId);
  const index = deleteSessionRecord(sessionId);

  if (index.tabs.length === 0) {
    const notesPath = resolveNotesPath();
    prepareWorkspace(notesPath, port, token);
    const record = createSessionRecord(notesPath);
    const agent = await createAgentForSessionRecord(record.sessionId, notesPath);
    return c.json({
      activeSessionId: record.sessionId,
      createdSession: {
        sessionId: record.sessionId,
        agentId: agent.agentId,
        notesPath,
        title: record.title,
        messages: record.messages,
        runs: record.runs,
      },
    });
  }

  return c.json({
    activeSessionId: index.activeSessionId,
    createdSession: null,
  });
});

app.put("/sessions/:sessionId/state", async (c) => {
  const sessionId = c.req.param("sessionId");
  if (!sessionExists(sessionId)) {
    return c.json({ error: "Session not found" }, 404);
  }

  const body = (await c.req.json()) as {
    messages?: unknown[];
    runs?: Record<string, unknown>;
  };

  const updated = saveSessionState(sessionId, {
    messages: (body.messages ?? []) as import("./sessions.ts").PersistedChatMessage[],
    runs: (body.runs ?? {}) as import("./sessions.ts").PersistedRunViewModel,
  });

  if (!updated) {
    return c.json({ error: "Session not found" }, 404);
  }

  return c.json({ ok: true });
});

app.post("/sessions/:sessionId/clear", async (c) => {
  const sessionId = c.req.param("sessionId");
  if (!sessionExists(sessionId)) {
    return c.json({ error: "Session not found" }, 404);
  }

  const notesPath = getSessionNotesPath(sessionId) ?? resolveNotesPath();
  if (!existsSync(notesPath)) {
    return c.json({ error: "Notes path does not exist" }, 400);
  }

  prepareWorkspace(notesPath, port, token);
  await resetSessionAgent(sessionId, notesPath);
  const updated = saveSessionState(sessionId, { messages: [], runs: {} });
  if (!updated) {
    return c.json({ error: "Session not found" }, 404);
  }

  const titled = updateSessionTitle(sessionId, DEFAULT_SESSION_TITLE);
  return c.json({ ok: true, title: titled?.title ?? DEFAULT_SESSION_TITLE });
});

app.put("/sessions/:sessionId/active", (c) => {
  const sessionId = c.req.param("sessionId");
  const index = setActiveSession(sessionId);
  if (!index) {
    return c.json({ error: "Session not found" }, 404);
  }
  return c.json({ activeSessionId: index.activeSessionId });
});

app.put("/sessions/:sessionId/title", async (c) => {
  const sessionId = c.req.param("sessionId");
  const body = (await c.req.json()) as { title?: string };
  const updated = updateSessionTitle(sessionId, body.title ?? DEFAULT_SESSION_TITLE);
  if (!updated) {
    return c.json({ error: "Session not found" }, 404);
  }
  return c.json({ title: updated.title });
});

app.post("/sessions/:sessionId/messages", async (c) => {
  const sessionId = c.req.param("sessionId");
  const body = (await c.req.json()) as {
    text?: string;
    attachments?: Array<{ name?: string; mimeType?: string; data?: string }>;
    toolPins?: ToolPinSelection;
    quickActionId?: string;
  };
  const text = body.text?.trim() ?? "";
  const attachments = (body.attachments ?? []).map((attachment) => ({
    name: attachment.name?.trim() ?? "attachment",
    mimeType: resolveMimeType(
      attachment.name?.trim() ?? "attachment",
      attachment.mimeType?.trim() || "application/octet-stream",
    ),
    data: (attachment.data ?? "").replace(/\s+/g, ""),
  }));

  if (!text && attachments.length === 0) {
    return c.json({ error: "text or attachments are required" }, 400);
  }

  for (const attachment of attachments) {
    if (!attachment.data) {
      return c.json({ error: `Attachment ${attachment.name} is missing data` }, 400);
    }
  }

  if (!sessionExists(sessionId)) {
    return c.json({ error: "Session not found" }, 404);
  }

  const settings = loadSettings();
  const notesPath = settings.notesPath ?? resolveNotesPath();
  if (!existsSync(notesPath)) {
    return c.json({ error: "Notes path does not exist" }, 400);
  }

  prepareWorkspace(notesPath, port, token);
  const agent = await ensureAgentForSession(sessionId, notesPath);

  const isMorningReview = isMorningReviewQuickAction(body.quickActionId);
  const isGoodMorningFeel = isGoodMorningFeelQuickAction(body.quickActionId);
  const isGoodNightInitial = isGoodNightQuickAction(body.quickActionId);
  const isGoodNightReflection = isGoodNightReflectionQuickAction(body.quickActionId);
  const isStructuredQuickAction = isMorningReview || isGoodNightInitial;
  const effectiveToolSelection = isGoodMorningFeel || isGoodNightReflection
    ? {
        obsidian: false,
        linear: false,
        calendar: false,
        whoop: false,
      }
    : isStructuredQuickAction
    ? {
        obsidian: body.toolPins?.obsidian === "on",
        linear: body.toolPins?.linear === "on",
        calendar: body.toolPins?.calendar === "on",
        whoop: body.toolPins?.whoop === "on",
      }
    : resolveToolSelection(text, body.toolPins);

  let userMessage;
  let attachmentMeta;
  try {
    const built = buildUserMessage(text, attachments, notesPath);
    userMessage = augmentUserMessage(
      built.message,
      effectiveToolSelection,
      notesPath,
      settings.vaultName,
    );
    attachmentMeta = built.attachmentMeta;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid attachments";
    return c.json({ error: message }, 400);
  }

  const runId = crypto.randomUUID();
  const state = createRunState(runId);

  activeRuns.set(runId, {
    runId,
    subscribers: new Set(),
    events: [],
    done: false,
    state,
    cancelRequested: false,
  });
  sessionRunId.set(sessionId, runId);

  broadcast(runId, { type: "run.started", runId, timestamp: Date.now() });
  broadcast(runId, {
    type: "activity.started",
    runId,
    timestamp: Date.now(),
  });

  void (async () => {
    const active = activeRuns.get(runId);
    if (!active) return;

    try {
      const selectedModel = getSelectedModelSelection(loadSettings());
      const sendOptions: Parameters<typeof agent.send>[1] = { model: selectedModel };
      if (effectiveToolSelection.obsidian) {
        sendOptions.local = {
          customTools: getWorkspaceCustomTools(notesPath, {
            requestShellApproval: async (command, cwd) => {
              if (!isDestructiveShellCommand(command)) {
                return true;
              }

              const request = createApprovalRequest({
                runId,
                summary: `Allow shell command: ${command}`,
                action: "shell",
                path: cwd,
              });

              broadcast(runId, {
                type: "approval.requested",
                approvalId: request.id,
                runId,
                summary: request.summary,
                action: request.action,
                path: request.path,
              });

              const approved = await waitForApproval(request);

              broadcast(runId, {
                type: "approval.resolved",
                approvalId: request.id,
                approved,
              });

              return approved;
            },
          }),
        };
      }
      const mcpServers = getMcpServersForSelection(effectiveToolSelection);
      if (mcpServers) {
        sendOptions.mcpServers = mcpServers;
      }

      let messageForAgent = userMessage;

      if (isMorningReview) {
        const prefetched = await prefetchMorningReviewData();

        const logPrefetchStep = (
          stepId: string,
          kind: ToolCategory,
          label: string,
          status: "completed" | "error",
        ) => {
          broadcast(runId, {
            type: "activity.step",
            runId,
            stepId,
            kind,
            label,
            status,
            toolName: "morning_review",
          });
        };

        if (prefetched.errors.weather) {
          logPrefetchStep(`morning-weather-${runId}`, "generic", `Weather fetch failed: ${prefetched.errors.weather}`, "error");
        } else if (prefetched.weather) {
          logPrefetchStep(`morning-weather-${runId}`, "generic", "Loaded today's weather", "completed");
        }

        if (prefetched.errors.whoop) {
          logPrefetchStep(`morning-whoop-${runId}`, "whoop", `Whoop fetch failed: ${prefetched.errors.whoop}`, "error");
        } else if (prefetched.whoop) {
          logPrefetchStep(`morning-whoop-${runId}`, "whoop", "Loaded today's Whoop snapshot", "completed");
        } else {
          logPrefetchStep(`morning-whoop-${runId}`, "whoop", "No Whoop data for today", "completed");
        }

        if (prefetched.errors.linear) {
          logPrefetchStep(`morning-linear-${runId}`, "linear", `Linear fetch failed: ${prefetched.errors.linear}`, "error");
        } else {
          logPrefetchStep(
            `morning-linear-${runId}`,
            "linear",
            prefetched.linearIssues.length > 0
              ? `Loaded ${prefetched.linearIssues.length} Linear issue(s) due today`
              : "No Linear issues due today",
            "completed",
          );
        }

        if (prefetched.errors.calendar) {
          logPrefetchStep(`morning-calendar-${runId}`, "calendar", `Calendar fetch failed: ${prefetched.errors.calendar}`, "error");
        } else {
          logPrefetchStep(
            `morning-calendar-${runId}`,
            "calendar",
            prefetched.calendar.events.length > 0
              ? `Loaded ${prefetched.calendar.events.length} calendar event(s) for today`
              : "No calendar events today",
            "completed",
          );
        }

        try {
          applyMorningReviewDailyNote(notesPath, {
            whoop: prefetched.whoop,
            weather: prefetched.weather,
            timezone: loadUserTimezone(),
          });
          logPrefetchStep(
            `morning-obsidian-${runId}`,
            "notes",
            "Updated today's daily note with wake time, sleep, weather, and recovery",
            "completed",
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logPrefetchStep(
            `morning-obsidian-${runId}`,
            "notes",
            `Daily note update failed: ${message}`,
            "error",
          );
        }

        const urgentIssues = filterUrgentLinearIssues(prefetched.linearIssues);
        if (urgentIssues.length > 0) {
          const urgentEvent = {
            type: "entities.created" as const,
            runId,
            entityType: "linear_issue" as const,
            items: urgentIssues,
          };
          broadcast(runId, urgentEvent);
          scheduleLinearAvatarBackfill(runId, urgentEvent);
        }

        const response = buildGoodMorningChatResponse({
          firstName: loadUserFirstName(),
          linearIssues: prefetched.linearIssues,
          whoop: prefetched.whoop,
        });

        state.lastAssistantText = response;
        broadcast(runId, {
          type: "message.delta",
          runId,
          text: response,
        });

        completeRun(runId, state, "finished");
        return;
      }

      if (isGoodNightInitial) {
        const result = await runGoodNightActions(notesPath);

        const logGoodNightStep = (
          stepId: string,
          kind: ToolCategory,
          label: string,
          status: "completed" | "error",
        ) => {
          broadcast(runId, {
            type: "activity.step",
            runId,
            stepId,
            kind,
            label,
            status,
            toolName: "good_night",
          });
        };

        if (result.errors.whoop) {
          logGoodNightStep(
            `good-night-whoop-${runId}`,
            "whoop",
            `Whoop fetch failed: ${result.errors.whoop}`,
            "error",
          );
        } else if (result.whoop) {
          logGoodNightStep(
            `good-night-whoop-${runId}`,
            "whoop",
            result.whoop.strainScore != null
              ? `Loaded today's strain (${result.whoop.strainScore})`
              : "Loaded today's Whoop snapshot",
            "completed",
          );
        } else {
          logGoodNightStep(`good-night-whoop-${runId}`, "whoop", "No Whoop data for today", "completed");
        }

        if (result.errors.obsidian) {
          logGoodNightStep(
            `good-night-obsidian-${runId}`,
            "notes",
            `Daily note update failed: ${result.errors.obsidian}`,
            "error",
          );
        } else if (result.dailyNoteUpdate) {
          const productivityLabel =
            result.productivityScore != null
              ? `, productivity ${result.productivityScore} (${result.completedIssues.count} issues completed)`
              : "";
          logGoodNightStep(
            `good-night-obsidian-${runId}`,
            "notes",
            `Updated ${result.dailyNoteUpdate.path} with bedtime, strain, recovery, and productivity${productivityLabel}`,
            "completed",
          );
        }

        if (result.errors.linearCompleted) {
          logGoodNightStep(
            `good-night-linear-completed-${runId}`,
            "linear",
            `Completed issues fetch failed: ${result.errors.linearCompleted}`,
            "error",
          );
        } else {
          logGoodNightStep(
            `good-night-linear-completed-${runId}`,
            "linear",
            `${result.completedIssues.count} Linear issue(s) completed today`,
            "completed",
          );
        }

        if (result.errors.linear) {
          logGoodNightStep(
            `good-night-linear-${runId}`,
            "linear",
            `Linear rollover failed: ${result.errors.linear}`,
            "error",
          );
        } else if (result.linear.moved.length > 0) {
          logGoodNightStep(
            `good-night-linear-${runId}`,
            "linear",
            `Moved ${result.linear.moved.length} Linear issue(s) to ${result.linear.tomorrowDate}`,
            "completed",
          );
        } else if (result.linear.failed.length > 0) {
          logGoodNightStep(
            `good-night-linear-${runId}`,
            "linear",
            `Failed to move ${result.linear.failed.length} Linear issue(s) to tomorrow`,
            "error",
          );
        } else {
          logGoodNightStep(
            `good-night-linear-${runId}`,
            "linear",
            "No Linear issues due today to move",
            "completed",
          );
        }

        if (result.completedIssues.issues.length > 0) {
          const completedEvent = {
            type: "entities.created" as const,
            runId,
            entityType: "linear_issue_completed" as const,
            items: result.completedIssues.issues,
          };
          broadcast(runId, completedEvent);
          scheduleLinearAvatarBackfill(runId, {
            ...completedEvent,
            entityType: "linear_issue",
          });
        }

        const response = buildGoodNightChatResponse({
          firstName: loadUserFirstName(),
          movedIssueCount: result.linear.moved.length,
          completedIssueCount: result.completedIssues.count,
          productivityScore: result.productivityScore,
          whoop: result.whoop,
        });

        state.lastAssistantText = response;
        broadcast(runId, {
          type: "message.delta",
          runId,
          text: response,
        });

        completeRun(runId, state, "finished");
        return;
      }

      if (isGoodNightReflection) {
        const logReflectionStep = (
          stepId: string,
          label: string,
          status: "completed" | "error" | "running",
        ) => {
          broadcast(runId, {
            type: "activity.step",
            runId,
            stepId,
            kind: "generic",
            label,
            status,
            toolName: "good_night_reflection",
          });
        };

        const polishStepId = `good-night-reflection-polish-${runId}`;
        logReflectionStep(polishStepId, "Polishing your evening reflection", "running");

        try {
          const result = await runGoodNightReflectionFlow(notesPath, text, {
            agent,
            model: selectedModel,
            timezone: loadUserTimezone(),
          });

          logReflectionStep(polishStepId, "Polished evening reflection", "completed");

          broadcast(runId, {
            type: "tool.completed",
            runId,
            toolCallId: `good-night-reflection-daily-note-${runId}`,
            toolName: "write_workspace_file",
            category: "notes",
            structured: {
              type: "file_diff",
              path: result.dailyNoteUpdate.path,
              summary: `Updated ${result.dailyNoteUpdate.path} with evening reflection`,
            },
          });
          broadcast(runId, {
            type: "activity.step",
            runId,
            stepId: `good-night-reflection-note-${runId}`,
            kind: "notes",
            label: `Updated ${result.dailyNoteUpdate.path} with evening reflection`,
            status: "completed",
            toolName: "good_night_reflection",
          });

          state.lastAssistantText = result.response;
          broadcast(runId, {
            type: "message.delta",
            runId,
            text: result.response,
          });

          completeRun(runId, state, "finished");
        } catch (error) {
          const message = error instanceof Error ? error.message : "Good night reflection failed";
          logReflectionStep(polishStepId, message, "error");
          broadcast(runId, {
            type: "run.failed",
            runId,
            message,
          });
          completeRun(runId, state, "error");
        }
        return;
      }

      if (isGoodMorningFeel) {
        const logFeelStep = (
          stepId: string,
          label: string,
          status: "completed" | "error" | "running",
        ) => {
          broadcast(runId, {
            type: "activity.step",
            runId,
            stepId,
            kind: "generic",
            label,
            status,
            toolName: "good_morning_feel",
          });
        };

        const polishStepId = `good-morning-feel-polish-${runId}`;
        logFeelStep(polishStepId, "Polishing your feel line", "running");

        try {
          const result = await runGoodMorningFeelFlow(notesPath, text, {
            agent,
            model: selectedModel,
            timezone: loadUserTimezone(),
          });

          logFeelStep(polishStepId, "Polished feel line", "completed");

          broadcast(runId, {
            type: "tool.completed",
            runId,
            toolCallId: `good-morning-feel-daily-note-${runId}`,
            toolName: "write_workspace_file",
            category: "notes",
            structured: {
              type: "file_diff",
              path: result.dailyNoteUpdate.path,
              summary: `Updated ${result.dailyNoteUpdate.lines.join(", ")}`,
            },
          });
          broadcast(runId, {
            type: "activity.step",
            runId,
            stepId: `good-morning-feel-note-${runId}`,
            kind: "notes",
            label: `Updated ${result.dailyNoteUpdate.path} with feel line`,
            status: "completed",
            toolName: "good_morning_feel",
          });

          state.lastAssistantText = result.response;
          broadcast(runId, {
            type: "message.delta",
            runId,
            text: result.response,
          });

          completeRun(runId, state, "finished");
        } catch (error) {
          const message = error instanceof Error ? error.message : "Good morning feel failed";
          logFeelStep(polishStepId, message, "error");
          broadcast(runId, {
            type: "run.failed",
            runId,
            message,
          });
          completeRun(runId, state, "error");
        }
        return;
      }

      let sdkRun: Run;
      try {
        sdkRun = await agent.send(messageForAgent, sendOptions);
      } catch (sendError) {
        const msg = sendError instanceof Error ? sendError.message : String(sendError);
        if (/already has active run/i.test(msg)) {
          // The agent has a wedged persisted run (e.g. a previous run was
          // interrupted by a crash/restart). Expire it and retry once.
          sdkRun = await agent.send(userMessage, {
            ...sendOptions,
            local: { ...(sendOptions.local ?? {}), force: true },
          });
        } else {
          throw sendError;
        }
      }

      active.sdkRun = sdkRun;

      if (isRunCancelled(runId)) {
        if (sdkRun.supports("cancel")) {
          await sdkRun.cancel();
        }
        completeRun(runId, state, "cancelled");
        return;
      }

      try {
        for await (const message of sdkRun.stream()) {
          if (isRunCancelled(runId)) {
            if (sdkRun.supports("cancel")) {
              await sdkRun.cancel();
            }
            break;
          }
          for (const event of await mapSdkMessageToEvents(message, state)) {
            broadcast(runId, event);
            scheduleLinearAvatarBackfill(runId, event);
          }
        }
      } catch (streamError) {
        if (isRunCancelled(runId) || isBenignSdkStreamError(streamError)) {
          // Cancel or benign HTTP/2 teardown — fall through to wait/cancel handling.
        } else {
          throw streamError;
        }
      }

      if (isRunCancelled(runId)) {
        completeRun(runId, state, "cancelled");
        return;
      }

      const result = await sdkRun.wait();
      const status =
        result.status === "finished"
          ? "finished"
          : result.status === "cancelled"
            ? "cancelled"
            : "error";

      completeRun(runId, state, status);
    } catch (error) {
      if (isRunCancelled(runId)) {
        completeRun(runId, state, "cancelled");
        return;
      }

      const message = error instanceof Error ? error.message : "Run failed";
      if (error instanceof CursorAgentError) {
        broadcast(runId, {
          type: "startup.failed",
          message,
          retryable: error.isRetryable,
        });
      } else {
        broadcast(runId, {
          type: "run.failed",
          runId,
          message,
        });
        completeRun(runId, state, "error");
      }
    }
  })();

  return c.json({ runId, attachments: attachmentMeta });
});

app.get("/sessions/:sessionId/events", (c) => {
  const authHeader = c.req.header("authorization");
  const authQuery = c.req.query("auth");
  const provided = authHeader?.replace("Bearer ", "") ?? authQuery;
  if (provided !== token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const sessionId = c.req.param("sessionId");
  const runId = c.req.query("runId") ?? sessionRunId.get(sessionId);

  if (!runId || !activeRuns.has(runId)) {
    return c.json({ error: "No active run" }, 404);
  }

  return streamSSE(c, async (stream) => {
    const run = activeRuns.get(runId)!;

    for (const event of run.events) {
      await stream.writeSSE({
        event: event.type,
        data: JSON.stringify(event),
      });
      if (isTerminalEvent(event)) {
        activeRuns.delete(runId);
        return;
      }
    }

    if (run.done) {
      activeRuns.delete(runId);
      return;
    }

    const queue: AgentEvent[] = [];
    let notify: (() => void) | null = null;

    const subscriber: RunSubscriber = (event) => {
      queue.push(event);
      notify?.();
    };

    run.subscribers.add(subscriber);

    try {
      while (true) {
        while (queue.length > 0) {
          const event = queue.shift()!;
          await stream.writeSSE({
            event: event.type,
            data: JSON.stringify(event),
          });

          if (isTerminalEvent(event)) {
            activeRuns.delete(runId);
            return;
          }
        }

        if (run.done) {
          activeRuns.delete(runId);
          return;
        }

        await new Promise<void>((resolve) => {
          notify = resolve;
          if (queue.length > 0 || run.done) {
            notify = null;
            resolve();
          }
        });
        notify = null;
      }
    } finally {
      run.subscribers.delete(subscriber);
    }
  });
});

app.post("/runs/:runId/cancel", async (c) => {
  const runId = c.req.param("runId");
  const run = activeRuns.get(runId);
  if (!run || run.done) {
    return c.json({ error: "Run not found or already finished" }, 404);
  }

  run.cancelRequested = true;

  const sdkRun = run.sdkRun;
  if (sdkRun?.supports("cancel")) {
    try {
      await sdkRun.cancel();
    } catch (error) {
      console.error("[sidecar] Failed to cancel run:", error);
    }
  }

  return c.json({ ok: true });
});

app.get("/approvals", (c) => {
  return c.json({ items: listPendingApprovals() });
});

app.post("/approvals/:approvalId/respond", async (c) => {
  const approvalId = c.req.param("approvalId");
  const body = (await c.req.json()) as { approved?: boolean };
  const ok = resolveApproval(approvalId, Boolean(body.approved));
  if (!ok) {
    return c.json({ error: "Approval not found" }, 404);
  }
  return c.json({ ok: true });
});

app.post("/hooks/shell-check", async (c) => {
  const body = (await c.req.json()) as {
    command?: string;
    cwd?: string;
  };

  const command = body.command ?? "";
  if (!isDestructiveShellCommand(command)) {
    return c.json({ permission: "allow" });
  }

  const runId = [...sessionRunId.values()].at(-1) ?? "hook-run";
  const request = createApprovalRequest({
    runId,
    summary: `Allow shell command: ${command}`,
    action: "shell",
    path: body.cwd,
  });

  broadcast(runId, {
    type: "approval.requested",
    approvalId: request.id,
    runId,
    summary: request.summary,
    action: request.action,
    path: request.path,
  });

  const approved = await waitForApproval(request);

  broadcast(runId, {
    type: "approval.resolved",
    approvalId: request.id,
    approved,
  });

  return c.json({ permission: approved ? "allow" : "deny" });
});

app.get("/workspace/status", (c) => {
  const settings = loadSettings();
  if (!settings.notesPath) {
    return c.json({ status: "No notes path configured." });
  }
  return c.json({ status: getGitStatus(settings.notesPath) });
});

app.get("/workspace/diff", (c) => {
  const settings = loadSettings();
  if (!settings.notesPath) {
    return c.json({ diff: "" });
  }
  return c.json({ diff: getGitDiff(settings.notesPath) });
});

app.post("/workspace/revert", (c) => {
  const settings = loadSettings();
  if (!settings.notesPath) {
    return c.json({ ok: false }, 400);
  }
  return c.json({ ok: revertLastChanges(settings.notesPath) });
});

app.post("/approvals/request", async (c) => {
  const body = (await c.req.json()) as {
    runId?: string;
    summary?: string;
    action?: string;
    path?: string;
  };

  const request = createApprovalRequest({
    runId: body.runId ?? "manual",
    summary: body.summary ?? "Confirm action",
    action: body.action ?? "unknown",
    path: body.path,
  });

  broadcast(body.runId ?? "manual", {
    type: "approval.requested",
    approvalId: request.id,
    runId: body.runId ?? "manual",
    summary: request.summary,
    action: request.action,
    path: request.path,
  });

  return c.json({ approvalId: request.id });
});

app.get("/tts/voices", (c) => {
  if (!isTtsAvailable()) {
    return c.json({ error: "TTS is not available. Run npm run download:tts." }, 503);
  }
  return c.json({ voices: listTtsVoices() });
});

app.post("/tts/speak", async (c) => {
  if (!isTtsAvailable()) {
    return c.json({ error: "TTS is not available. Run npm run download:tts." }, 503);
  }

  const body = await c.req.json<{ text?: string; voiceId?: string }>();
  const text = body.text?.trim();
  if (!text) {
    return c.json({ error: "text is required" }, 400);
  }

  const voices = listTtsVoices();
  const voiceId = body.voiceId ?? DEFAULT_VOICE_ID;
  if (!voices.some((voice) => voice.id === voiceId)) {
    return c.json({ error: `Unknown voice: ${voiceId}` }, 400);
  }

  try {
    const audio = await synthesizeSpeech(text, voiceId);
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Speech synthesis failed";
    return c.json({ error: message }, 500);
  }
});

app.post("/tts/stop", (c) => {
  stopSpeech();
  return c.json({ ok: true });
});

app.post("/tts/warmup", async (c) => {
  if (!isTtsAvailable()) {
    return c.json({ error: "TTS is not available. Run npm run download:tts." }, 503);
  }

  const body = await c.req.json<{ voiceId?: string }>().catch(() => ({ voiceId: undefined }));
  const voiceId = body.voiceId ?? DEFAULT_VOICE_ID;

  try {
    await warmupSpeech(voiceId);
    return c.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TTS warmup failed";
    return c.json({ error: message }, 500);
  }
});

app.get("/stt/status", (c) => {
  if (!isSttAvailable()) {
    return c.json({ error: "STT is not available. Run npm run download:stt." }, 503);
  }

  return c.json({
    available: true,
    ready: isSttReady(),
    modelId: getSttModelId(),
  });
});

app.post("/stt/warmup", async (c) => {
  if (!isSttAvailable()) {
    return c.json({ error: "STT is not available. Run npm run download:stt." }, 503);
  }

  try {
    await warmupStt();
    return c.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "STT warmup failed";
    return c.json({ error: message }, 500);
  }
});

app.post("/stt/transcribe", async (c) => {
  if (!isSttAvailable()) {
    return c.json({ error: "STT is not available. Run npm run download:stt." }, 503);
  }

  const contentType = c.req.header("content-type") ?? "";
  if (!contentType.includes("application/octet-stream")) {
    return c.json({ error: "Expected application/octet-stream body with Float32 PCM @ 16 kHz mono" }, 415);
  }

  const buffer = await c.req.arrayBuffer();
  if (buffer.byteLength === 0) {
    return c.json({ text: "" });
  }

  if (buffer.byteLength % 4 !== 0) {
    return c.json({ error: "PCM buffer length must be a multiple of 4 bytes (Float32 samples)" }, 400);
  }

  try {
    const pcm = new Float32Array(buffer);
    const text = await transcribeAudio(pcm);
    return c.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Speech transcription failed";
    return c.json({ error: message }, 500);
  }
});

const ready: ReadyMessage = { type: "ready", port, token };
console.log(JSON.stringify(ready));

const bootSettings = loadSettings();
ensureAgentProfile();
ensureUserProfile();
if (bootSettings.notesPath) {
  prepareWorkspace(bootSettings.notesPath, port, token);
}

void refreshMaxModelCache().catch(() => {
  // Fall back to MAX_MODEL_ID_FALLBACK when the model list is unavailable.
});

export default {
  port,
  hostname: "127.0.0.1",
  idleTimeout: 255,
  fetch: app.fetch,
};
