import "./process-guard.ts";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { cors } from "hono/cors";
import { bearerAuth } from "hono/bearer-auth";
import { HTTPException } from "hono/http-exception";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
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
import { startLinearOAuthAuth } from "./linearAuth.ts";
import { getLinearAuthToken } from "./linear/auth-token.ts";
import {
  getAgentProfilePath,
  getCursorApiKey,
  getGeminiApiKey,
  getLinearApiKey,
  getNotesDirOverride,
  getSidecarPort,
  getSidecarToken,
  getUserProfilePath,
  isGoogleCalendarAuthenticated,
  isGoogleCalendarConfigured,
  isLinearOAuthAuthenticated,
  isLinearOAuthConfigured,
  isWhoopAuthenticated,
  isWhoopConfigured,
} from "./config.ts";
import {
  defaultAutoModelId,
  defaultMaxModelId,
  getModelMode,
  getSelectedModelId,
  listAvailableModels,
  resolveSelectedModelName,
  resolveSelectedModelNameFresh,
  getSelectedModelSelection,
  refreshMaxModelCache,
} from "./models.ts";
import {
  createRunLifecycleEvents,
  createRunState,
  mapSdkMessageToEvents,
  reconcileAssistantTextFromRun,
} from "./events.ts";
import { resolveLinearIssueAvatars } from "./linearAvatars.ts";
import {
  fetchAllIssuesDueToday,
  isMorningReviewQuickAction,
  resolveMorningReviewDueDate,
} from "./morning-review-linear.ts";
import {
  isGoodMorningFeelQuickAction,
  isGoodMorningWakeQuickAction,
} from "./good-morning.ts";
import { isDailyCaptureQuickAction } from "./daily-capture.ts";
import { isGroceryListQuickAction } from "./grocery-list.ts";
import {
  clearPendingDeleteFile,
  isDeleteFileQuickAction,
  peekPendingDeleteFile,
  respondToPendingDeleteFile,
} from "./delete-file.ts";
import { fetchLinearProjectById, fetchLinearProjectsPage } from "./linear/projects.ts";
import { searchLinearIssues } from "./linear/search.ts";
import { fetchLinearProjectOverview, updateLinearProjectContent } from "./linear/project-overview.ts";
import { fetchLinearProjectIssues } from "./linear/project-issues.ts";
import { fetchLinearIssuesByDueDates } from "./linear/issues-by-due-date.ts";
import {
  getLinearProjectWatcherConfig,
  getLinearProjectWatchersMap,
  linearWatcherOrchestrator,
  setLinearProjectWatcherConfig,
  type LinearWatcherStreamEvent,
} from "./linear/watcher-orchestrator.ts";
import {
  createProjectDocument,
  deleteLinearDocument,
  fetchLinearDocument,
  fetchLinearProjectDocuments,
  fetchLinearTeamDocuments,
  updateLinearDocument,
} from "./vault/project-documents.ts";
import { readVaultDocument, updateVaultDocument } from "./vault/vault-document.ts";
import { fetchLinearIssueDetail, updateLinearIssueDetail } from "./linear/issue-detail.ts";
import {
  createLinearAgentThread,
  createLinearIssueComment,
  fetchLinearIssueCommentThread,
  fetchLinearIssueCommentThreads,
} from "./linear/issue-comments.ts";
import { buildFocusContextSection, type FocusContextInput } from "./context/focus.ts";
import { fetchLinearTeams } from "./linear/teams.ts";
import { listLlmExtractTasks, runLlmExtract } from "./llm-extract/index.ts";
import { dispatchAutomationHandler } from "./automation/registry.ts";
import type { AutomationHandlerContext } from "./automation/types.ts";
import {
  DAILY_NOTE_FOLDER,
  ensureTodayDailyNote,
  getTodayDailyNote,
  readDailyNoteStats,
} from "./daily-note.ts";
import {
  isGoodNightQuickAction,
  isGoodNightReflectionQuickAction,
} from "./good-night.ts";
import {
  findPdfAttachmentMeta,
  isLetterConfirmQuickAction,
  isLetterQuickAction,
  clearPendingLetter,
  peekPendingLetter,
  runLetterConfirmFlow,
  runLetterInitialFlow,
} from "./letter.ts";
import { getLetterFilingOptions } from "./letter-options.ts";
import {
  runGoodMorningDashboardFlow,
  runGoodMorningFeelDashboardFlow,
  runGoodMorningWakeDashboardFlow,
  runGoodNightDashboardFlow,
  runGoodNightReflectionDashboardFlow,
} from "./dashboard-flows.ts";
import {
  getExecutionMode,
  isTestExecutionMode,
} from "./execution-mode.ts";
import { getMcpServersForSelection } from "./mcp.ts";
import { isDestructiveShellCommand } from "./shell-policy.ts";
import { getWorkspaceCustomTools } from "./workspace-tools.ts";
import { fetchWhoopTodaySnapshot } from "./morning-review-whoop.ts";
import { getWhoopSetupInfo } from "./whoopAuth.ts";
import {
  getIntegrationsStatus,
  importGoogleCalendarCredentials,
  saveGoogleCalendarOAuthCredentials,
  saveLinearOAuthCredentials,
  updateIntegrationSecrets,
} from "./integrations-secrets.ts";
import {
  parseProfileKind,
  readProfileContent,
  writeProfileContent,
} from "./profiles-api.ts";
import {
  runIntegrationTests,
  type IntegrationTestReport,
  type IntegrationTestResult,
  type IntegrationTestTarget,
} from "./integrations-test.ts";
import {
  ensureVaultNavFolders,
  listVaultDirectoryEntries,
  VAULT_NAV_FOLDER_NAMES,
} from "./vault-nav-structure.ts";
import { buildVaultSearchIndex, invalidateVaultSearchIndexCache } from "./vault/search-index.ts";
import { listVaultFiles } from "./vault-files.ts";
import { peekWhoopSnapshotCache, setWhoopSnapshotCache } from "./whoop/snapshot-cache.ts";
import {
  appendWorkoutSets,
  assertWorkoutDateKey,
  deleteWorkoutExercise,
  deleteWorkoutSession,
  deleteWorkoutSet,
  loadExerciseCatalog,
  prepareAppendSets,
  readAllWorkoutSets,
  readWorkoutDaySets,
  renameWorkoutExercise,
  updateWorkoutSet,
} from "./workouts/store.ts";
import { ensureLinearWorkspaceVaultStructure } from "./linear-workspace-vault-structure.ts";
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
  listSessionSummaries,
  loadSessionState,
  migrateLegacySessionIfNeeded,
  saveSessionState,
  sessionExists,
  setActiveSession,
  updateSessionTitle,
} from "./sessions.ts";
import {
  clearLookupSessionState,
  createLookupSessionRecord,
  DEFAULT_LOOKUP_SESSION_TITLE,
  deleteLookupSessionRecord,
  getActiveLookupSessionId,
  listLookupSessionSummaries,
  loadLookupSessionState,
  lookupSessionExists,
  saveLookupSessionState,
  setActiveLookupSession,
  updateLookupSessionTitle,
} from "./lookup-sessions.ts";
import { persistLookupAttachments } from "./lookup-attachment-store.ts";
import { buildGeminiUserParts } from "./lookup-attachments.ts";
import { completeLookupRun, runLookupMessage } from "./lookup-handler.ts";
import { normalizeLookupOutputFormat } from "./lookup-output-format.ts";
import {
  normalizeLookupSearchMode,
  resolveLookupSearchModeForRequest,
} from "./lookup-tools.ts";
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
import { loadTtsModule, loadSttModule } from "./speech-modules.ts";

const token = getSidecarToken();
const port = getSidecarPort();
const SIDECAR_RUNTIME_ID = `${Date.now()}-${process.pid}`;

function readSidecarVersion(): string | null {
  try {
    const raw = readFileSync(join(import.meta.dir, "..", "package.json"), "utf8");
    const parsed = JSON.parse(raw) as { version?: unknown };
    const version =
      typeof parsed.version === "string" ? parsed.version.trim() : "";
    return version.length > 0 ? version : null;
  } catch {
    return null;
  }
}

function readSidecarBuildId(): string {
  try {
    const serverFilePath = join(import.meta.dir, "server.ts");
    const mtimeMs = statSync(serverFilePath).mtimeMs;
    return String(Math.floor(mtimeMs));
  } catch {
    return "unknown";
  }
}

const SIDECAR_VERSION = readSidecarVersion();
const SIDECAR_BUILD_ID = readSidecarBuildId();

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
  abortController?: AbortController;
}

const activeRuns = new Map<string, ActiveRun>();
const sessionRunId = new Map<string, string>();
const lookupSessionRunId = new Map<string, string>();

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

function broadcastAssistantMessage(runId: string, text: string): void {
  if (!text) return;
  broadcast(runId, {
    type: "message.delta",
    runId,
    text,
  });
}

const app = new Hono();

app.use(
  "*",
  cors({
    // Localhost-only sidecar: reflect the Tauri webview origin (tauri.localhost, etc.).
    origin: (origin) => origin ?? "http://tauri.localhost",
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.use("/flows/*", bearerAuth({ token }));
app.use("/settings", bearerAuth({ token }));
app.use("/sessions/*", bearerAuth({ token }));
app.use("/lookup/*", bearerAuth({ token }));
app.use("/runs/*", bearerAuth({ token }));
app.use("/approvals/*", bearerAuth({ token }));
app.use("/hooks/*", bearerAuth({ token }));
app.use("/workspace/*", bearerAuth({ token }));
app.use("/tts/*", bearerAuth({ token }));
app.use("/stt/*", bearerAuth({ token }));
app.use("/llm-extract/*", bearerAuth({ token }));
app.use("/linear/*", bearerAuth({ token }));
app.use("/integrations/*", bearerAuth({ token }));
app.use("/profiles/*", bearerAuth({ token }));
app.use("/vault/*", bearerAuth({ token }));

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  const message = err instanceof Error ? err.message : "Unknown error";
  const status = message === "Unauthorized" ? 401 : 500;
  return c.json({ error: message || "Unknown error" }, status);
});

app.get("/healthz", (c) => {
  return c.json({
    ok: true,
    hasApiKey: Boolean(getCursorApiKey()),
    hasGeminiApiKey: Boolean(getGeminiApiKey()),
    hasLinearApiKey: Boolean(getLinearApiKey()),
    hasLinearOAuthCredentials: isLinearOAuthConfigured(),
    hasLinearOAuthAuth: isLinearOAuthAuthenticated(),
    hasGoogleCalendarCredentials: isGoogleCalendarConfigured(),
    hasGoogleCalendarAuth: isGoogleCalendarAuthenticated(),
    hasWhoopConfigured: isWhoopConfigured(),
    hasWhoopAuth: isWhoopAuthenticated(),
    sidecarRuntimeId: SIDECAR_RUNTIME_ID,
    sidecarVersion: SIDECAR_VERSION,
    sidecarBuildId: SIDECAR_BUILD_ID,
  });
});

app.get("/llm-extract/tasks", (c) => {
  return c.json({ tasks: listLlmExtractTasks() });
});

app.post("/llm-extract", async (c) => {
  if (!getGeminiApiKey()) {
    return c.json({ error: "Set GEMINI_API_KEY in ~/.backsteros-agent/.env" }, 400);
  }

  const body = (await c.req.json()) as {
    taskId?: string;
    message?: string;
    context?: Record<string, unknown>;
  };

  const taskId = body.taskId?.trim();
  const message = body.message?.trim();
  if (!taskId) {
    return c.json({ error: "taskId is required" }, 400);
  }
  if (!message) {
    return c.json({ error: "message is required" }, 400);
  }

  try {
    const data = await runLlmExtract(taskId, message, { context: body.context });
    return c.json({ taskId, data });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Extraction failed";
    return c.json({ error: messageText }, 500);
  }
});

app.get("/linear/issues/search", async (c) => {
  if (!getLinearAuthToken()) {
    return c.json(
      {
        error: "Linear is not connected. Add an API key or connect OAuth in Settings.",
        issues: [],
      },
      400,
    );
  }

  const term = c.req.query("q")?.trim() ?? "";
  if (!term) {
    return c.json({ issues: [] });
  }

  const limitRaw = Number(c.req.query("limit"));
  const limit = Number.isFinite(limitRaw) ? limitRaw : undefined;

  try {
    const issues = await searchLinearIssues(term, { limit });
    return c.json({ issues });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to search Linear issues";
    return c.json({ error: message, issues: [] }, 500);
  }
});

app.get("/linear/projects", async (c) => {
  if (!getLinearAuthToken()) {
    return c.json(
      {
        error: "Linear is not connected. Add an API key or connect OAuth in Settings.",
        projects: [],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
      400,
    );
  }

  const query = c.req.query("q")?.trim() || undefined;
  const after = c.req.query("after")?.trim() || undefined;
  const firstRaw = Number(c.req.query("first"));
  const first = Number.isFinite(firstRaw) ? firstRaw : undefined;

  try {
    const page = await fetchLinearProjectsPage({ query, after, first });
    return c.json(page);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Linear projects";
    return c.json({ error: message }, 500);
  }
});

app.get("/linear/teams", async (c) => {
  if (!getLinearAuthToken()) {
    return c.json(
      {
        error: "Linear is not connected. Add an API key or connect OAuth in Settings.",
        teams: [],
      },
      400,
    );
  }

  try {
    const teams = await fetchLinearTeams();
    return c.json({ teams });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Linear teams";
    return c.json({ error: message, teams: [] }, 500);
  }
});

app.get("/linear/projects/:projectId/overview", async (c) => {
  if (!getLinearAuthToken()) {
    return c.json(
      {
        error: "Linear is not connected. Add an API key or connect OAuth in Settings.",
        overview: null,
      },
      400,
    );
  }

  const projectId = c.req.param("projectId")?.trim();
  if (!projectId) {
    return c.json({ error: "projectId is required", overview: null }, 400);
  }

  try {
    const overview = await fetchLinearProjectOverview(projectId);
    if (!overview) {
      return c.json({ error: "Project not found", overview: null }, 404);
    }
    return c.json({ overview });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load project overview";
    return c.json({ error: message, overview: null }, 500);
  }
});

app.get("/linear/projects/:projectId/issues", async (c) => {
  if (!getLinearAuthToken()) {
    return c.json(
      {
        error: "Linear is not connected. Add an API key or connect OAuth in Settings.",
        issues: [],
      },
      400,
    );
  }

  const projectId = c.req.param("projectId")?.trim();
  if (!projectId) {
    return c.json({ error: "projectId is required", issues: [] }, 400);
  }

  try {
    const result = await fetchLinearProjectIssues(projectId);
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load project issues";
    return c.json({ error: message, issues: [], workflowStates: [] }, 500);
  }
});

app.get("/linear/watchers/config", async (c) => {
  return c.json({ watchers: getLinearProjectWatchersMap() });
});

app.get("/linear/watchers/config/:projectId", async (c) => {
  const projectId = c.req.param("projectId")?.trim();
  if (!projectId) {
    return c.json({ error: "projectId is required", config: null }, 400);
  }

  return c.json({
    projectId,
    config: getLinearProjectWatcherConfig(projectId),
  });
});

app.put("/linear/watchers/config/:projectId", async (c) => {
  const projectId = c.req.param("projectId")?.trim();
  if (!projectId) {
    return c.json({ error: "projectId is required", config: null }, 400);
  }

  const body = (await c.req.json().catch(() => ({}))) as {
    enabled?: unknown;
    pollIntervalMs?: unknown;
    statusChangesOnly?: unknown;
    autoDispatchAgents?: unknown;
    dispatchStatuses?: unknown;
    projectName?: unknown;
  };

  if (
    body.enabled !== undefined &&
    typeof body.enabled !== "boolean"
  ) {
    return c.json({ error: "enabled must be a boolean", config: null }, 400);
  }

  if (
    body.pollIntervalMs !== undefined &&
    (typeof body.pollIntervalMs !== "number" || !Number.isFinite(body.pollIntervalMs))
  ) {
    return c.json({ error: "pollIntervalMs must be a number", config: null }, 400);
  }

  if (
    body.statusChangesOnly !== undefined &&
    typeof body.statusChangesOnly !== "boolean"
  ) {
    return c.json({ error: "statusChangesOnly must be a boolean", config: null }, 400);
  }

  if (
    body.autoDispatchAgents !== undefined &&
    typeof body.autoDispatchAgents !== "boolean"
  ) {
    return c.json({ error: "autoDispatchAgents must be a boolean", config: null }, 400);
  }

  if (
    body.dispatchStatuses !== undefined &&
    (!Array.isArray(body.dispatchStatuses) ||
      body.dispatchStatuses.some((value) => typeof value !== "string"))
  ) {
    return c.json({ error: "dispatchStatuses must be an array of strings", config: null }, 400);
  }

  if (
    body.projectName !== undefined &&
    body.projectName !== null &&
    typeof body.projectName !== "string"
  ) {
    return c.json({ error: "projectName must be a string", config: null }, 400);
  }

  try {
    const config = setLinearProjectWatcherConfig(projectId, {
      enabled: body.enabled,
      pollIntervalMs:
        typeof body.pollIntervalMs === "number" ? body.pollIntervalMs : undefined,
      statusChangesOnly: body.statusChangesOnly,
      autoDispatchAgents: body.autoDispatchAgents,
      dispatchStatuses: Array.isArray(body.dispatchStatuses)
        ? body.dispatchStatuses
        : undefined,
      projectName: typeof body.projectName === "string" ? body.projectName : undefined,
    });
    linearWatcherOrchestrator.notifyConfigChanged();
    return c.json({ projectId, config });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save watcher config";
    return c.json({ error: message, config: null }, 500);
  }
});

app.get("/linear/watchers/events", (c) => {
  const authHeader = c.req.header("authorization");
  const authQuery = c.req.query("auth");
  const provided = authHeader?.replace("Bearer ", "") ?? authQuery;
  if (provided !== token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return streamSSE(c, async (stream) => {
    const queue: LinearWatcherStreamEvent[] = [];
    let notify: (() => void) | null = null;

    const subscriber = (event: LinearWatcherStreamEvent) => {
      queue.push(event);
      notify?.();
    };

    const unsubscribe = linearWatcherOrchestrator.subscribe(subscriber);

    try {
      while (true) {
        while (queue.length > 0) {
          const event = queue.shift()!;
          await stream.writeSSE({
            event: event.type,
            data: JSON.stringify(event),
          });
        }

        await new Promise<void>((resolve) => {
          notify = resolve;
          if (queue.length > 0) {
            notify = null;
            resolve();
          }
        });
        notify = null;
      }
    } finally {
      unsubscribe();
    }
  });
});

app.get("/linear/issues/:issueId", async (c) => {
  if (!getLinearAuthToken()) {
    return c.json(
      {
        error: "Linear is not connected. Add an API key or connect OAuth in Settings.",
        issue: null,
      },
      400,
    );
  }

  const issueId = c.req.param("issueId")?.trim();
  if (!issueId) {
    return c.json({ error: "issueId is required", issue: null }, 400);
  }

  try {
    const issue = await fetchLinearIssueDetail(issueId);
    if (!issue) {
      return c.json({ error: "Issue not found", issue: null }, 404);
    }
    return c.json({ issue });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load issue";
    return c.json({ error: message, issue: null }, 500);
  }
});

app.patch("/linear/issues/:issueId", async (c) => {
  if (!getLinearAuthToken()) {
    return c.json(
      {
        error: "Linear is not connected. Add an API key or connect OAuth in Settings.",
        issue: null,
      },
      400,
    );
  }

  const issueId = c.req.param("issueId")?.trim();
  if (!issueId) {
    return c.json({ error: "issueId is required", issue: null }, 400);
  }

  const body = (await c.req.json().catch(() => ({}))) as {
    stateId?: unknown;
    priority?: unknown;
    estimate?: unknown;
    labelIds?: unknown;
    description?: unknown;
  };
  const updates: {
    stateId?: string;
    priority?: number;
    estimate?: number | null;
    labelIds?: string[];
    description?: string | null;
  } = {};

  if ("stateId" in body) {
    if (typeof body.stateId !== "string" || !body.stateId.trim()) {
      return c.json({ error: "stateId must be a non-empty string", issue: null }, 400);
    }
    updates.stateId = body.stateId.trim();
  }

  if ("priority" in body) {
    if (typeof body.priority !== "number" || !Number.isFinite(body.priority)) {
      return c.json({ error: "priority must be a number", issue: null }, 400);
    }
    updates.priority = Math.round(body.priority);
  }

  if ("estimate" in body) {
    if (body.estimate !== null && (typeof body.estimate !== "number" || !Number.isFinite(body.estimate))) {
      return c.json({ error: "estimate must be a number or null", issue: null }, 400);
    }
    updates.estimate = body.estimate === null ? null : Math.round(body.estimate);
  }

  if ("labelIds" in body) {
    if (!Array.isArray(body.labelIds) || body.labelIds.some((labelId) => typeof labelId !== "string")) {
      return c.json({ error: "labelIds must be an array of strings", issue: null }, 400);
    }
    updates.labelIds = Array.from(
      new Set(body.labelIds.map((labelId) => labelId.trim()).filter((labelId) => labelId.length > 0)),
    );
  }

  if ("description" in body) {
    if (body.description !== null && typeof body.description !== "string") {
      return c.json({ error: "description must be a string or null", issue: null }, 400);
    }
    updates.description = body.description;
  }

  if (!Object.keys(updates).length) {
    return c.json(
      { error: "stateId, priority, estimate, labelIds, or description is required", issue: null },
      400,
    );
  }

  try {
    const issue = await updateLinearIssueDetail(issueId, updates);
    if (!issue) {
      return c.json({ error: "Issue not found", issue: null }, 404);
    }
    return c.json({ issue });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update issue";
    return c.json({ error: message, issue: null }, 500);
  }
});

app.get("/linear/issues/:issueId/comment-threads", async (c) => {
  if (!getLinearAuthToken()) {
    return c.json(
      {
        error: "Linear is not connected. Add an API key or connect OAuth in Settings.",
        threads: [],
      },
      400,
    );
  }

  const issueId = c.req.param("issueId")?.trim();
  if (!issueId) {
    return c.json({ error: "issueId is required", threads: [] }, 400);
  }

  try {
    const threads = await fetchLinearIssueCommentThreads(issueId);
    return c.json({ threads });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load comment threads";
    return c.json({ error: message, threads: [] }, 500);
  }
});

app.get("/linear/issues/:issueId/comment-threads/:threadId", async (c) => {
  if (!getLinearAuthToken()) {
    return c.json(
      {
        error: "Linear is not connected. Add an API key or connect OAuth in Settings.",
        viewerId: null,
        comments: [],
      },
      400,
    );
  }

  const issueId = c.req.param("issueId")?.trim();
  const threadId = c.req.param("threadId")?.trim();
  if (!issueId || !threadId) {
    return c.json({ error: "issueId and threadId are required", viewerId: null, comments: [] }, 400);
  }

  try {
    const thread = await fetchLinearIssueCommentThread(issueId, threadId);
    return c.json(thread);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load comment thread";
    return c.json({ error: message, viewerId: null, comments: [] }, 500);
  }
});

app.post("/linear/issues/:issueId/comment-threads", async (c) => {
  if (!getLinearAuthToken()) {
    return c.json(
      { error: "Linear is not connected. Add an API key or connect OAuth in Settings." },
      400,
    );
  }

  const issueId = c.req.param("issueId")?.trim();
  if (!issueId) {
    return c.json({ error: "issueId is required" }, 400);
  }

  const body = (await c.req.json()) as { body?: string; parentId?: string; newThread?: boolean };
  try {
    if (body.newThread) {
      const comment = await createLinearAgentThread(issueId);
      return c.json({ comment });
    }

    const text = body.body?.trim() ?? "";
    if (!text) {
      return c.json({ error: "body is required" }, 400);
    }

    const comment = await createLinearIssueComment(issueId, text, body.parentId);
    return c.json({ comment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create comment";
    return c.json({ error: message }, 500);
  }
});

app.get("/linear/projects/:projectId/documents", async (c) => {
  if (!getLinearAuthToken()) {
    return c.json(
      {
        error: "Linear is not connected. Add an API key or connect OAuth in Settings.",
        documents: [],
      },
      400,
    );
  }

  const projectId = c.req.param("projectId")?.trim();
  if (!projectId) {
    return c.json({ error: "projectId is required", documents: [] }, 400);
  }

  try {
    const documents = await fetchLinearProjectDocuments(projectId);
    return c.json({ documents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load project documents";
    return c.json({ error: message, documents: [] }, 500);
  }
});

app.post("/linear/projects/:projectId/documents", async (c) => {
  if (!getLinearAuthToken()) {
    return c.json(
      {
        error: "Linear is not connected. Add an API key or connect OAuth in Settings.",
        document: null,
      },
      400,
    );
  }

  const projectId = c.req.param("projectId")?.trim();
  if (!projectId) {
    return c.json({ error: "projectId is required", document: null }, 400);
  }

  try {
    const document = await createProjectDocument(projectId);
    return c.json({ document });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create project document";
    return c.json({ error: message, document: null }, 500);
  }
});

app.get("/linear/teams/:teamId/documents", async (c) => {
  if (!getLinearAuthToken()) {
    return c.json(
      {
        error: "Linear is not connected. Add an API key or connect OAuth in Settings.",
        documents: [],
      },
      400,
    );
  }

  const teamId = c.req.param("teamId")?.trim();
  if (!teamId) {
    return c.json({ error: "teamId is required", documents: [] }, 400);
  }

  try {
    const documents = await fetchLinearTeamDocuments(teamId);
    return c.json({ documents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load team documents";
    return c.json({ error: message, documents: [] }, 500);
  }
});

app.get("/linear/documents/:documentId", async (c) => {
  if (!getLinearAuthToken()) {
    return c.json(
      {
        error: "Linear is not connected. Add an API key or connect OAuth in Settings.",
        document: null,
      },
      400,
    );
  }

  const documentId = c.req.param("documentId")?.trim();
  if (!documentId) {
    return c.json({ error: "documentId is required", document: null }, 400);
  }

  try {
    const document = await fetchLinearDocument(documentId);
    if (!document) {
      return c.json({ error: "Document not found", document: null }, 404);
    }
    return c.json({ document });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load document";
    return c.json({ error: message, document: null }, 500);
  }
});

app.patch("/linear/documents/:documentId", async (c) => {
  if (!getLinearAuthToken()) {
    return c.json(
      {
        error: "Linear is not connected. Add an API key or connect OAuth in Settings.",
        document: null,
      },
      400,
    );
  }

  const documentId = c.req.param("documentId")?.trim();
  if (!documentId) {
    return c.json({ error: "documentId is required", document: null }, 400);
  }

  const body = (await c.req.json()) as { title?: string; content?: string; body?: string };
  const title = body.title?.trim();
  const content = body.content ?? body.body;

  if (title === undefined && content === undefined) {
    return c.json({ error: "title or content is required", document: null }, 400);
  }

  try {
    const document = await updateLinearDocument(documentId, {
      ...(title !== undefined ? { title } : {}),
      ...(content !== undefined ? { content } : {}),
    });
    return c.json({ document });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update document";
    return c.json({ error: message, document: null }, 500);
  }
});

app.delete("/linear/documents/:documentId", async (c) => {
  if (!getLinearAuthToken()) {
    return c.json(
      {
        error: "Linear is not connected. Add an API key or connect OAuth in Settings.",
        ok: false,
      },
      400,
    );
  }

  const documentId = c.req.param("documentId")?.trim();
  if (!documentId) {
    return c.json({ error: "documentId is required", ok: false }, 400);
  }

  try {
    await deleteLinearDocument(documentId);
    return c.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete document";
    return c.json({ error: message, ok: false }, 500);
  }
});

app.patch("/linear/projects/:projectId/overview/description", async (c) => {
  if (!getLinearAuthToken()) {
    return c.json(
      {
        error: "Linear is not connected. Add an API key or connect OAuth in Settings.",
        overview: null,
      },
      400,
    );
  }

  const projectId = c.req.param("projectId")?.trim();
  if (!projectId) {
    return c.json({ error: "projectId is required", overview: null }, 400);
  }

  const body = (await c.req.json().catch(() => ({}))) as { content?: string };
  if (typeof body.content !== "string") {
    return c.json({ error: "content is required", overview: null }, 400);
  }

  try {
    const overview = await updateLinearProjectContent(projectId, body.content);
    if (!overview) {
      return c.json({ error: "Project not found", overview: null }, 404);
    }
    return c.json({ overview });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update project description";
    return c.json({ error: message, overview: null }, 500);
  }
});

app.get("/linear/projects/:projectId", async (c) => {
  if (!getLinearAuthToken()) {
    return c.json({ error: "Linear is not connected. Add an API key or connect OAuth in Settings." }, 400);
  }

  const projectId = c.req.param("projectId")?.trim();
  if (!projectId) {
    return c.json({ error: "projectId is required" }, 400);
  }

  try {
    const project = await fetchLinearProjectById(projectId);
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }
    return c.json({ project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Linear project";
    return c.json({ error: message }, 500);
  }
});

app.post("/integrations/whoop/setup", async (c) => {
  const info = getWhoopSetupInfo();
  return c.json(info);
});

app.get("/integrations/status", (c) => {
  return c.json(getIntegrationsStatus());
});

app.put("/integrations/secrets", async (c) => {
  const body = (await c.req.json()) as {
    cursorApiKey?: string | null;
    linearApiKey?: string | null;
    geminiApiKey?: string | null;
  };
  return c.json(updateIntegrationSecrets(body));
});

app.post("/integrations/test", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    target?: IntegrationTestTarget | "all";
    cursorApiKey?: string;
    linearApiKey?: string;
    geminiApiKey?: string;
    googleOAuthClientId?: string;
    googleOAuthClientSecret?: string;
    linearOAuthClientId?: string;
    linearOAuthClientSecret?: string;
  };
  const target = body.target ?? "all";
  if (
    target !== "all" &&
    target !== "cursor" &&
    target !== "linear" &&
    target !== "gemini" &&
    target !== "googleCalendar" &&
    target !== "googleCalendarCredentials" &&
    target !== "linearOAuthCredentials"
  ) {
    return c.json({ error: "Invalid integration test target" }, 400);
  }

  const credentials = {
    cursorApiKey: body.cursorApiKey,
    linearApiKey: body.linearApiKey,
    geminiApiKey: body.geminiApiKey,
    googleOAuthClientId: body.googleOAuthClientId,
    googleOAuthClientSecret: body.googleOAuthClientSecret,
    linearOAuthClientId: body.linearOAuthClientId,
    linearOAuthClientSecret: body.linearOAuthClientSecret,
  };

  const result = await runIntegrationTests(target, credentials);
  return c.json(result);
});

app.get("/integrations/cursor/models", async (c) => {
  if (!getCursorApiKey()?.trim()) {
    return c.json({ error: "Cursor API key is not configured" }, 400);
  }

  try {
    const models = await listAvailableModels();
    return c.json({ models });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list Cursor models";
    return c.json({ error: message }, 500);
  }
});

app.post("/integrations/google-calendar/credentials", async (c) => {
  try {
    const body = await c.req.json();
    if (body && typeof body === "object" && ("clientId" in body || "clientSecret" in body || "clear" in body)) {
      return c.json(saveGoogleCalendarOAuthCredentials(body as {
        clientId?: string | null;
        clientSecret?: string | null;
        clear?: boolean;
      }));
    }
    return c.json(importGoogleCalendarCredentials(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save Google OAuth credentials";
    return c.json({ error: message }, 400);
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

app.post("/integrations/linear/credentials", async (c) => {
  try {
    const body = await c.req.json();
    return c.json(
      saveLinearOAuthCredentials(body as {
        clientId?: string | null;
        clientSecret?: string | null;
        clear?: boolean;
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save Linear OAuth credentials";
    return c.json({ error: message }, 400);
  }
});

app.post("/integrations/linear/connect", async (c) => {
  try {
    const result = await startLinearOAuthAuth();
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start Linear authentication";
    return c.json({ error: message }, 500);
  }
});

app.get("/whoop/today", async (c) => {
  if (!isWhoopAuthenticated()) {
    return c.json({ authenticated: false, snapshot: null });
  }

  try {
    const snapshot = await fetchWhoopTodaySnapshot({ includeStrainDeepDive: true });
    setWhoopSnapshotCache(resolveMorningReviewDueDate(), snapshot);
    return c.json({ authenticated: true, snapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Whoop data";
    return c.json({ authenticated: true, snapshot: null, error: message }, 500);
  }
});

app.get("/whoop/day", async (c) => {
  if (!isWhoopAuthenticated()) {
    return c.json({ authenticated: false, snapshot: null });
  }

  const date = c.req.query("date")?.trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return c.json({ error: "date must be YYYY-MM-DD" }, 400);
  }

  try {
    const cached = peekWhoopSnapshotCache(date);
    if (cached) {
      return c.json({ authenticated: true, snapshot: cached });
    }
    const snapshot = await fetchWhoopTodaySnapshot({
      includeStrainDeepDive: true,
      date,
    });
    setWhoopSnapshotCache(date, snapshot);
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

app.post("/linear/issues/by-due-dates", async (c) => {
  const configured = Boolean(getLinearAuthToken());
  const body = (await c.req.json().catch(() => ({}))) as { dueDates?: unknown };
  if (!Array.isArray(body.dueDates)) {
    return c.json({ error: "dueDates must be an array", issuesByDueDate: {}, configured }, 400);
  }

  const dueDates = body.dueDates
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
  if (dueDates.length > 120) {
    return c.json(
      { error: "dueDates cannot contain more than 120 values", issuesByDueDate: {}, configured },
      400,
    );
  }

  if (!configured) {
    return c.json({
      configured: false,
      issuesByDueDate: Object.fromEntries(dueDates.map((dueDate) => [dueDate, []])),
    });
  }

  try {
    const issuesByDueDate = await fetchLinearIssuesByDueDates(dueDates);
    return c.json({ configured: true, issuesByDueDate });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Linear issues";
    return c.json({ error: message, issuesByDueDate: {}, configured: true }, 500);
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

app.post("/vault/daily-note/today/ensure", async (c) => {
  const notesPath = resolveNotesPath();

  if (!existsSync(notesPath) || !statSync(notesPath).isDirectory()) {
    return c.json({ error: "Notes path does not exist", note: null }, 400);
  }

  try {
    const note = ensureTodayDailyNote(notesPath);
    return c.json({ note });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to ensure daily note";
    return c.json({ error: message, note: null }, 500);
  }
});

app.get("/letter/filing-options", (c) => {
  const notesPath = resolveNotesPath();
  if (!existsSync(notesPath)) {
    return c.json({ error: "Notes path does not exist" }, 400);
  }

  return c.json(getLetterFilingOptions(notesPath));
});

app.get("/letter/pending/:sessionId", (c) => {
  const sessionId = c.req.param("sessionId");
  if (!sessionExists(sessionId)) {
    return c.json({ error: "Session not found" }, 404);
  }

  const pending = peekPendingLetter(sessionId);
  if (!pending) {
    return c.json({ pending: null });
  }

  return c.json({
    pending: {
      proposal: pending.proposal,
      originalName: pending.originalName,
    },
  });
});

app.delete("/letter/pending/:sessionId", (c) => {
  const sessionId = c.req.param("sessionId");
  if (!sessionExists(sessionId)) {
    return c.json({ error: "Session not found" }, 404);
  }

  clearPendingLetter(sessionId);
  return c.json({ ok: true });
});

app.get("/delete-file/pending/:sessionId", (c) => {
  const sessionId = c.req.param("sessionId");
  if (!sessionExists(sessionId)) {
    return c.json({ error: "Session not found" }, 404);
  }

  const pending = peekPendingDeleteFile(sessionId);
  return c.json({
    pending: pending ? { path: pending.path } : null,
  });
});

app.delete("/delete-file/pending/:sessionId", (c) => {
  const sessionId = c.req.param("sessionId");
  if (!sessionExists(sessionId)) {
    return c.json({ error: "Session not found" }, 404);
  }

  clearPendingDeleteFile(sessionId);
  return c.json({ ok: true });
});

app.post("/delete-file/respond", async (c) => {
  const body = (await c.req.json()) as {
    sessionId?: string;
    action?: "confirm" | "return";
  };
  const sessionId = body.sessionId?.trim();
  const action = body.action;
  if (!sessionId) {
    return c.json({ error: "sessionId is required" }, 400);
  }
  if (action !== "confirm" && action !== "return") {
    return c.json({ error: "action must be confirm or return" }, 400);
  }
  if (!sessionExists(sessionId)) {
    return c.json({ error: "Session not found" }, 404);
  }

  const notesPath = resolveNotesPath();
  if (!existsSync(notesPath)) {
    return c.json({ error: "Notes path does not exist" }, 400);
  }

  const result = respondToPendingDeleteFile(notesPath, sessionId, action);
  return c.json(result);
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

app.post("/flows/good-morning/wake", async (c) => {
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

  try {
    const result = await runGoodMorningWakeDashboardFlow(notesPath, answer);
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Good morning wake time failed";
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

  try {
    const result = await runGoodMorningFeelDashboardFlow(notesPath, answer);
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Good morning feel failed";
    return c.json({ error: message }, 500);
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

  try {
    const result = await runGoodNightReflectionDashboardFlow(notesPath, body.answers);
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Good night reflection failed";
    return c.json({ error: message }, 500);
  }
});

app.get("/settings", async (c) => {
  const settings = loadSettings();
  const modelMode = getModelMode(settings);
  const modelId = getSelectedModelId(settings);
  const modelName = resolveSelectedModelName(settings);
  return c.json({
    notesPath: settings.notesPath,
    vaultName: settings.vaultName ?? null,
    projectsPath: settings.projectsPath ?? null,
    agentId: settings.agentId,
    modelMode,
    modelId,
    autoModelId: settings.autoModelId ?? null,
    maxModelId: settings.maxModelId ?? null,
    modelName,
    executionMode: getExecutionMode(settings),
    issueLinkMode: settings.issueLinkMode ?? "external",
    groceryLinearProjectId: settings.groceryLinearProjectId ?? null,
    defaultModelMode: "auto",
    defaultExecutionMode: "live",
    defaultNotesPath: join(homedir(), "notes"),
    userProfilePath: getUserProfilePath(),
    agentProfilePath: getAgentProfilePath(),
  });
});

app.put("/settings", async (c) => {
  const body = (await c.req.json()) as {
    notesPath?: string;
    vaultName?: string | null;
    projectsPath?: string | null;
    modelMode?: string;
    executionMode?: string;
    autoModelId?: string | null;
    maxModelId?: string | null;
    issueLinkMode?: string;
    groceryLinearProjectId?: string | null;
  };
  const notesPath = body.notesPath?.trim();
  const projectsPath = body.projectsPath?.trim();
  const modelMode = body.modelMode?.trim();
  const executionMode = body.executionMode?.trim();
  const hasVaultName = body.vaultName !== undefined;
  const hasProjectsPath = body.projectsPath !== undefined;
  const hasIssueLinkMode = body.issueLinkMode !== undefined;
  const hasGroceryLinearProjectId = body.groceryLinearProjectId !== undefined;

  const hasAutoModelId = body.autoModelId !== undefined;
  const hasMaxModelId = body.maxModelId !== undefined;

  if (
    !notesPath &&
    !modelMode &&
    !executionMode &&
    !hasVaultName &&
    !hasProjectsPath &&
    !hasIssueLinkMode &&
    !hasGroceryLinearProjectId &&
    !hasAutoModelId &&
    !hasMaxModelId
  ) {
    return c.json(
      {
        error:
          "notesPath, vaultName, projectsPath, modelMode, executionMode, autoModelId, maxModelId, issueLinkMode, or groceryLinearProjectId is required",
      },
      400,
    );
  }

  if (modelMode && modelMode !== "auto" && modelMode !== "max") {
    return c.json({ error: "modelMode must be auto or max" }, 400);
  }

  if (executionMode && executionMode !== "live" && executionMode !== "test") {
    return c.json({ error: "executionMode must be live or test" }, 400);
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
    ensureVaultNavFolders(notesPath);
    ensureTodayDailyNote(notesPath);
    settings.notesPath = notesPath;
  }

  if (hasVaultName) {
    const trimmedVaultName = body.vaultName?.trim();
    settings.vaultName = trimmedVaultName || null;
  }

  if (hasProjectsPath) {
    settings.projectsPath = projectsPath || null;
  }

  if (modelMode === "auto" || modelMode === "max") {
    settings.modelMode = modelMode;
    settings.modelId = null;
    if (modelMode === "max") {
      await refreshMaxModelCache();
    }
  }

  if (hasAutoModelId) {
    const trimmed = body.autoModelId?.trim();
    settings.autoModelId = trimmed || null;
    settings.modelId = null;
  }

  if (hasMaxModelId) {
    const trimmed = body.maxModelId?.trim();
    settings.maxModelId = trimmed || null;
    settings.modelId = null;
  }

  if (executionMode === "live" || executionMode === "test") {
    settings.executionMode = executionMode;
  }

  if (hasIssueLinkMode) {
    settings.issueLinkMode = body.issueLinkMode === "internal" ? "internal" : "external";
  }

  if (hasGroceryLinearProjectId) {
    const trimmedProjectId = body.groceryLinearProjectId?.trim();
    settings.groceryLinearProjectId = trimmedProjectId || null;
  }

  saveSettings(settings);

  if (notesPath) {
    await resetAgentsForNotesPath();
  } else if (settings.notesPath) {
    await resetAgentsForNotesPath();
  }

  const next = loadSettings();
  const resolvedMode = getModelMode(next);
  const modelName = await resolveSelectedModelNameFresh(next);

  return c.json({
    notesPath: next.notesPath,
    vaultName: next.vaultName ?? null,
    projectsPath: next.projectsPath ?? null,
    agentId: next.notesPath ? next.agentIdByNotesPath[next.notesPath] ?? null : null,
    modelMode: resolvedMode,
    modelId: getSelectedModelId(next),
    autoModelId: next.autoModelId ?? null,
    maxModelId: next.maxModelId ?? null,
    modelName,
    executionMode: getExecutionMode(next),
    issueLinkMode: next.issueLinkMode ?? "external",
    groceryLinearProjectId: next.groceryLinearProjectId ?? null,
  });
});

app.get("/vault/folders", (c) => {
  return c.json({ folders: VAULT_NAV_FOLDER_NAMES });
});

app.post("/vault/linear-workspace-structure", async (c) => {
  const notesPath = resolveNotesPath();
  const body = (await c.req.json().catch(() => ({}))) as {
    teamId?: string | null;
    projectId?: string | null;
  };

  try {
    const created = await ensureLinearWorkspaceVaultStructure(notesPath, {
      teamId: body.teamId,
      projectId: body.projectId,
    });
    return c.json({ created });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create Linear workspace folders";
    return c.json({ error: message, created: [] }, 400);
  }
});

app.get("/vault/search-index", (c) => {
  const notesPath = resolveNotesPath();
  const devTiming = process.env.SIDECAR_DEV_TIMING === "1";
  const startedAt = devTiming ? performance.now() : 0;
  try {
    const entries = buildVaultSearchIndex(notesPath);
    if (devTiming) {
      console.log(
        `[sidecar timing] GET /vault/search-index ${(performance.now() - startedAt).toFixed(1)}ms (${entries.length} entries)`,
      );
    }
    return c.json({ entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build vault search index";
    return c.json({ error: message, entries: [] }, 500);
  }
});

app.get("/vault/entries", (c) => {
  const notesPath = resolveNotesPath();
  const path = c.req.query("path")?.trim();
  const flatten = c.req.query("flatten") === "true";
  const enrichRaw = c.req.query("enrich")?.trim();
  const enrich =
    enrichRaw === "whoop" || enrichRaw === "dates" || enrichRaw === "none" ? enrichRaw : "none";
  if (!path) {
    return c.json({ error: "path is required" }, 400);
  }

  try {
    if (flatten) {
      const files = listVaultFiles(notesPath)
        .filter((filePath) => filePath.startsWith(`${path}/`) || filePath === path)
        .filter((filePath) => filePath.toLowerCase().endsWith(".md"))
        .map((filePath) => ({
          name: filePath.split("/").pop() ?? filePath,
          kind: "file" as const,
          path: filePath,
        }));
      return c.json({ path, entries: files });
    }

    const entries = listVaultDirectoryEntries(notesPath, path, {
      enrich: enrich === "none" ? "none" : "whoop",
    });
    return c.json({ path, entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list vault directory";
    return c.json({ error: message }, 400);
  }
});

app.get("/vault/documents", (c) => {
  const notesPath = resolveNotesPath();
  const path = c.req.query("path")?.trim();
  if (!path) {
    return c.json({ error: "path is required" }, 400);
  }

  try {
    const document = readVaultDocument(notesPath, path);
    return c.json({ document });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load document";
    return c.json({ error: message }, 400);
  }
});

app.patch("/vault/documents", async (c) => {
  const notesPath = resolveNotesPath();
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const path =
    body && typeof body === "object" && "path" in body && typeof body.path === "string"
      ? body.path.trim()
      : "";
  if (!path) {
    return c.json({ error: "path is required" }, 400);
  }

  const title =
    body && typeof body === "object" && "title" in body && typeof body.title === "string"
      ? body.title
      : undefined;
  const content =
    body && typeof body === "object" && "body" in body && typeof body.body === "string"
      ? body.body
      : undefined;

  if (title === undefined && content === undefined) {
    return c.json({ error: "title or body is required" }, 400);
  }

  try {
    const document = await updateVaultDocument(notesPath, path, { title, body: content });
    invalidateVaultSearchIndexCache();
    return c.json({ document });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update document";
    return c.json({ error: message }, 400);
  }
});

app.get("/vault/workouts/sets", (c) => {
  const notesPath = resolveNotesPath();
  const from = c.req.query("from")?.trim() || undefined;
  const to = c.req.query("to")?.trim() || undefined;
  try {
    const result = readAllWorkoutSets(notesPath, { from, to });
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load workout sets";
    return c.json({ error: message }, 400);
  }
});

app.get("/vault/workouts/sets/:date", (c) => {
  const notesPath = resolveNotesPath();
  try {
    const dateKey = assertWorkoutDateKey(c.req.param("date"));
    const result = readWorkoutDaySets(notesPath, dateKey);
    return c.json({ date: dateKey, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load workout day";
    return c.json({ error: message }, 400);
  }
});

app.get("/vault/workouts/catalog", (c) => {
  const notesPath = resolveNotesPath();
  try {
    const result = loadExerciseCatalog(notesPath);
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load exercise catalog";
    return c.json({ error: message }, 400);
  }
});

app.post("/vault/workouts/sets", async (c) => {
  const notesPath = resolveNotesPath();
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const sets =
    body && typeof body === "object" && "sets" in body && Array.isArray(body.sets)
      ? body.sets
      : null;
  if (!sets || sets.length === 0) {
    return c.json({ error: "sets array is required" }, 400);
  }
  try {
    const prepared = prepareAppendSets(notesPath, sets);
    const count = appendWorkoutSets(notesPath, prepared);
    return c.json({ inserted: count, sets: prepared });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to append workout sets";
    return c.json({ error: message }, 400);
  }
});

app.patch("/vault/workouts/sets", async (c) => {
  const notesPath = resolveNotesPath();
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const locator =
    body && typeof body === "object" && "date" in body && "exercise" in body && "setNumber" in body
      ? {
          date: String(body.date),
          exercise: String(body.exercise),
          setNumber: Number(body.setNumber),
        }
      : null;
  const patch =
    body && typeof body === "object" && "patch" in body && typeof body.patch === "object"
      ? body.patch
      : null;
  if (!locator || !patch) {
    return c.json({ error: "locator and patch are required" }, 400);
  }
  try {
    const ok = updateWorkoutSet(notesPath, locator, {
      reps: Number(patch.reps),
      weight: Number(patch.weight),
      isBodyweight: Boolean(patch.isBodyweight),
    });
    return c.json({ ok });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update workout set";
    return c.json({ error: message }, 400);
  }
});

app.delete("/vault/workouts/sets", async (c) => {
  const notesPath = resolveNotesPath();
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const locator =
    body && typeof body === "object" && "date" in body && "exercise" in body && "setNumber" in body
      ? {
          date: String(body.date),
          exercise: String(body.exercise),
          setNumber: Number(body.setNumber),
        }
      : null;
  if (!locator) {
    return c.json({ error: "locator is required" }, 400);
  }
  try {
    const ok = deleteWorkoutSet(notesPath, locator);
    return c.json({ ok });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete workout set";
    return c.json({ error: message }, 400);
  }
});

app.delete("/vault/workouts/session", async (c) => {
  const notesPath = resolveNotesPath();
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const date =
    body && typeof body === "object" && "date" in body ? String(body.date) : "";
  if (!date) {
    return c.json({ error: "date is required" }, 400);
  }
  const sessionStartMs =
    body && typeof body === "object" && "sessionStartMs" in body
      ? Number(body.sessionStartMs)
      : undefined;
  try {
    const ok = deleteWorkoutSession(notesPath, assertWorkoutDateKey(date), sessionStartMs);
    return c.json({ ok });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete workout session";
    return c.json({ error: message }, 400);
  }
});

app.delete("/vault/workouts/exercise", async (c) => {
  const notesPath = resolveNotesPath();
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const locator =
    body && typeof body === "object" && "date" in body && "exercise" in body
      ? { date: String(body.date), exercise: String(body.exercise) }
      : null;
  if (!locator) {
    return c.json({ error: "date and exercise are required" }, 400);
  }
  try {
    const ok = deleteWorkoutExercise(notesPath, locator);
    return c.json({ ok });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete workout exercise";
    return c.json({ error: message }, 400);
  }
});

app.post("/vault/workouts/exercise/rename", async (c) => {
  const notesPath = resolveNotesPath();
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const locator =
    body && typeof body === "object" && "date" in body && "exercise" in body
      ? { date: String(body.date), exercise: String(body.exercise) }
      : null;
  const newExercise =
    body && typeof body === "object" && "newExercise" in body
      ? String(body.newExercise)
      : "";
  if (!locator || !newExercise.trim()) {
    return c.json({ error: "date, exercise, and newExercise are required" }, 400);
  }
  try {
    const ok = renameWorkoutExercise(notesPath, locator, newExercise);
    return c.json({ ok });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to rename workout exercise";
    return c.json({ error: message }, 400);
  }
});

app.get("/profiles/:kind", (c) => {
  const kind = parseProfileKind(c.req.param("kind"));
  if (!kind) {
    return c.json({ error: "Profile kind must be user or agent" }, 400);
  }

  try {
    return c.json({ content: readProfileContent(kind) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read profile";
    return c.json({ error: message }, 500);
  }
});

app.put("/profiles/:kind", async (c) => {
  const kind = parseProfileKind(c.req.param("kind"));
  if (!kind) {
    return c.json({ error: "Profile kind must be user or agent" }, 400);
  }

  const body = (await c.req.json().catch(() => ({}))) as { content?: string };
  if (typeof body.content !== "string") {
    return c.json({ error: "content is required" }, 400);
  }

  try {
    return c.json({ content: writeProfileContent(kind, body.content) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save profile";
    return c.json({ error: message }, 500);
  }
});

function resolveNotesPath(): string {
  const settings = loadSettings();
  return settings.notesPath ?? getNotesDirOverride() ?? join(homedir(), "notes");
}

function sanitizeWorkspaceFolderPart(input: string): string {
  return input
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
}

function buildIssueWorkspaceRelativePath(projectName: string, issueIdentifier: string): string {
  const safeProject = sanitizeWorkspaceFolderPart(projectName) || "project";
  const safeIssue = sanitizeWorkspaceFolderPart(issueIdentifier) || "issue";
  // Nested layout: <projects>/<project-name>/<issue-id>.
  return join(safeProject, safeIssue);
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

  const sessions = listSessionSummaries();
  const activeSessionId = getActiveSessionId() ?? sessions[0]?.sessionId ?? null;

  return c.json({
    activeSessionId,
    sessions,
  });
});

app.get("/sessions/:sessionId", (c) => {
  const sessionId = c.req.param("sessionId");
  const record = loadSessionState(sessionId);
  if (!record) {
    return c.json({ error: "Session not found" }, 404);
  }

  return c.json({
    sessionId: record.sessionId,
    agentId: record.agentId,
    notesPath: record.notesPath,
    title: record.title,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    messages: record.messages,
    runs: record.runs,
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
    captureTime?: string;
    groceryWeek?: string;
    focusContext?: FocusContextInput;
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
  const isGoodMorningWake = isGoodMorningWakeQuickAction(body.quickActionId);
  const isGoodMorningFeel = isGoodMorningFeelQuickAction(body.quickActionId);
  const isGoodNightInitial = isGoodNightQuickAction(body.quickActionId);
  const isGoodNightReflection = isGoodNightReflectionQuickAction(body.quickActionId);
  const isLetterInitial = isLetterQuickAction(body.quickActionId);
  const isLetterConfirm = isLetterConfirmQuickAction(body.quickActionId);
  const isDailyCapture = isDailyCaptureQuickAction(body.quickActionId);
  const isGroceryList = isGroceryListQuickAction(body.quickActionId);
  const isDeleteFile = isDeleteFileQuickAction(body.quickActionId);
  const isStructuredQuickAction = isMorningReview || isGoodNightInitial || isLetterInitial;
  const focusToolSelection = body.focusContext
    ? {
        obsidian:
          body.focusContext.kind === "vault_document" ||
          body.focusContext.kind === "vault_folder",
        linear: true,
        calendar: false,
        whoop: false,
      }
    : null;
  const effectiveToolSelection = focusToolSelection
    ?? (isGoodMorningWake || isGoodMorningFeel || isGoodNightReflection || isLetterConfirm || isDailyCapture || isGroceryList || isDeleteFile
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
    : resolveToolSelection(text, body.toolPins));

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
    if (body.focusContext) {
      const focusSection = await buildFocusContextSection(body.focusContext, notesPath);
      if (focusSection) {
        userMessage = {
          ...userMessage,
          text: `[System: ${focusSection}]\n\n${userMessage.text}`,
        };
      }
    }
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

      const automationHandlerContext: AutomationHandlerContext = {
        runId,
        sessionId,
        text,
        notesPath,
        timezone: loadUserTimezone(),
        captureTime: body.captureTime?.trim() || undefined,
        groceryWeek: body.groceryWeek?.trim() || undefined,
        selectedModel: isTestExecutionMode() ? undefined : selectedModel,
        logStep: (stepId, kind, label, status, toolName = "automation") => {
          broadcast(runId, {
            type: "activity.step",
            runId,
            stepId,
            kind,
            label,
            status,
            toolName,
          });
        },
        broadcastAssistantMessage: (assistantText) => broadcastAssistantMessage(runId, assistantText),
        setLastAssistantText: (assistantText) => {
          state.lastAssistantText = assistantText;
        },
        completeFinished: () => completeRun(runId, state, "finished"),
        completeFailed: (message) => {
          broadcast(runId, {
            type: "run.failed",
            runId,
            message,
          });
          completeRun(runId, state, "error");
        },
        broadcast: (event) => broadcast(runId, event as AgentEvent),
        scheduleLinearAvatarBackfill,
      };

      if (await dispatchAutomationHandler(body.quickActionId, automationHandlerContext)) {
        return;
      }

      if (isLetterInitial) {
        const pdf = findPdfAttachmentMeta(attachmentMeta, attachments);
        if (!pdf) {
          throw new Error("Attach a PDF letter before running /letter.");
        }

        const logLetterStep = (
          stepId: string,
          label: string,
          status: "completed" | "error" | "running",
        ) => {
          broadcast(runId, {
            type: "activity.step",
            runId,
            stepId,
            kind: "notes",
            label,
            status,
            toolName: "letter_intake",
          });
        };

        logLetterStep(`letter-read-${runId}`, "Reading the PDF letter", "running");

        try {
          const result = await runLetterInitialFlow(notesPath, sessionId, pdf, {
            model: isTestExecutionMode() ? undefined : selectedModel,
          });

          logLetterStep(`letter-read-${runId}`, "Analyzed the PDF letter", "completed");

          state.lastAssistantText = result.response;
          broadcastAssistantMessage(runId, result.response);

          completeRun(runId, state, "finished");
        } catch (error) {
          const message = error instanceof Error ? error.message : "Letter intake failed";
          logLetterStep(`letter-read-${runId}`, message, "error");
          broadcast(runId, {
            type: "run.failed",
            runId,
            message,
          });
          completeRun(runId, state, "error");
        }
        return;
      }

      if (isLetterConfirm) {
        const logLetterConfirmStep = (
          stepId: string,
          label: string,
          status: "completed" | "error" | "running",
        ) => {
          broadcast(runId, {
            type: "activity.step",
            runId,
            stepId,
            kind: "notes",
            label,
            status,
            toolName: "letter_confirm",
          });
        };

        logLetterConfirmStep(`letter-file-${runId}`, "Filing the letter in your vault", "running");

        try {
          const result = await runLetterConfirmFlow(notesPath, sessionId, text, {
            model: isTestExecutionMode() ? undefined : selectedModel,
          });

          if (result.action === "clarify") {
            logLetterConfirmStep(
              `letter-file-${runId}`,
              "Need more letter filing details",
              "completed",
            );
            const clarifyResponse =
              result.response?.trim() ||
              "I couldn't process that reply. Please try again with the project name or say none to skip.";
            state.lastAssistantText = clarifyResponse;
            broadcastAssistantMessage(runId, clarifyResponse);
            completeRun(runId, state, "finished");
            return;
          }

          logLetterConfirmStep(`letter-file-${runId}`, "Filed the letter in Letters/", "completed");

          broadcast(runId, {
            type: "tool.completed",
            runId,
            toolCallId: `letter-wrapper-${runId}`,
            toolName: "write_workspace_file",
            category: "notes",
            structured: {
              type: "file_diff",
              path: result.filing.wrapperPath,
              summary: `Created letter note ${result.filing.wrapperPath}`,
            },
          });

          state.lastAssistantText = result.response;
          broadcastAssistantMessage(runId, result.response);

          completeRun(runId, state, "finished");
        } catch (error) {
          const message = error instanceof Error ? error.message : "Letter filing failed";
          logLetterConfirmStep(`letter-file-${runId}`, message, "error");
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

      const fallbackText = reconcileAssistantTextFromRun(state, result);
      if (fallbackText) {
        broadcastAssistantMessage(runId, fallbackText);
      }

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

app.get("/lookup/sessions", (c) => {
  const sessions = listLookupSessionSummaries();
  const activeSessionId = getActiveLookupSessionId() ?? sessions[0]?.sessionId ?? null;
  return c.json({ activeSessionId, sessions });
});

app.get("/lookup/sessions/:sessionId", (c) => {
  const sessionId = c.req.param("sessionId");
  const record = loadLookupSessionState(sessionId);
  if (!record) {
    return c.json({ error: "Session not found" }, 404);
  }

  return c.json({
    sessionId: record.sessionId,
    title: record.title,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    messages: record.messages,
    runs: record.runs,
  });
});

app.post("/lookup/sessions", (c) => {
  const record = createLookupSessionRecord();
  return c.json({
    sessionId: record.sessionId,
    title: record.title,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    messages: record.messages,
    runs: record.runs,
  });
});

app.delete("/lookup/sessions/:sessionId", (c) => {
  const sessionId = c.req.param("sessionId");
  if (!lookupSessionExists(sessionId)) {
    return c.json({ error: "Session not found" }, 404);
  }

  const index = deleteLookupSessionRecord(sessionId);
  if (index.tabs.length === 0) {
    const record = createLookupSessionRecord();
    return c.json({
      activeSessionId: record.sessionId,
      createdSession: {
        sessionId: record.sessionId,
        title: record.title,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
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

app.put("/lookup/sessions/:sessionId/state", async (c) => {
  const sessionId = c.req.param("sessionId");
  if (!lookupSessionExists(sessionId)) {
    return c.json({ error: "Session not found" }, 404);
  }

  const body = (await c.req.json()) as {
    messages?: unknown[];
    runs?: Record<string, unknown>;
  };

  const updated = saveLookupSessionState(sessionId, {
    messages: (body.messages ?? []) as import("./sessions.ts").PersistedChatMessage[],
    runs: (body.runs ?? {}) as import("./sessions.ts").PersistedRunViewModel,
  });

  if (!updated) {
    return c.json({ error: "Session not found" }, 404);
  }

  return c.json({ ok: true });
});

app.post("/lookup/sessions/:sessionId/clear", (c) => {
  const sessionId = c.req.param("sessionId");
  if (!lookupSessionExists(sessionId)) {
    return c.json({ error: "Session not found" }, 404);
  }

  clearLookupSessionState(sessionId);
  const updated = updateLookupSessionTitle(sessionId, DEFAULT_LOOKUP_SESSION_TITLE);
  return c.json({ ok: true, title: updated?.title ?? DEFAULT_LOOKUP_SESSION_TITLE });
});

app.put("/lookup/sessions/:sessionId/active", (c) => {
  const sessionId = c.req.param("sessionId");
  const index = setActiveLookupSession(sessionId);
  if (!index) {
    return c.json({ error: "Session not found" }, 404);
  }
  return c.json({ activeSessionId: index.activeSessionId });
});

app.put("/lookup/sessions/:sessionId/title", async (c) => {
  const sessionId = c.req.param("sessionId");
  const body = (await c.req.json()) as { title?: string };
  const updated = updateLookupSessionTitle(sessionId, body.title ?? DEFAULT_LOOKUP_SESSION_TITLE);
  if (!updated) {
    return c.json({ error: "Session not found" }, 404);
  }
  return c.json({ title: updated.title });
});

app.post("/lookup/sessions/:sessionId/messages", async (c) => {
  const sessionId = c.req.param("sessionId");
  if (!lookupSessionExists(sessionId)) {
    return c.json({ error: "Session not found" }, 404);
  }

  if (!getGeminiApiKey()) {
    return c.json({ error: "Set GEMINI_API_KEY in ~/.backsteros-agent/.env" }, 400);
  }

  const body = (await c.req.json()) as {
    text?: string;
    depthMode?: string;
    searchMode?: string;
    outputFormat?: string;
    attachments?: Array<{ name?: string; mimeType?: string; data?: string }>;
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

  const depthMode = body.depthMode?.trim();
  if (depthMode && depthMode !== "fast" && depthMode !== "deep") {
    return c.json({ error: "depthMode must be fast or deep" }, 400);
  }

  const searchMode = resolveLookupSearchModeForRequest(
    normalizeLookupSearchMode(body.searchMode),
    text,
    attachments.length > 0,
  );
  const outputFormat = normalizeLookupOutputFormat(body.outputFormat);

  const runId = crypto.randomUUID();

  let attachmentMeta;
  try {
    const built = await buildGeminiUserParts(text, attachments);
    attachmentMeta = built.attachmentMeta;
    if (attachments.length > 0) {
      attachmentMeta = await persistLookupAttachments(
        sessionId,
        runId,
        attachments,
        attachmentMeta,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid attachments";
    return c.json({ error: message }, 400);
  }
  const state = createRunState(runId);

  activeRuns.set(runId, {
    runId,
    subscribers: new Set(),
    events: [],
    done: false,
    state,
    cancelRequested: false,
  });
  lookupSessionRunId.set(sessionId, runId);

  const abortController = new AbortController();
  const active = activeRuns.get(runId);
  if (active) {
    active.abortController = abortController;
  }

  void runLookupMessage({
    runId,
    sessionId,
    prompt: text,
    attachments,
    depthMode: depthMode === "deep" ? "deep" : "fast",
    searchMode,
    outputFormat,
    signal: abortController.signal,
    broadcast: (event) => broadcast(runId, event),
    isCancelled: () => isRunCancelled(runId),
    complete: (status) => completeLookupRun(runId, state, status, (event) => broadcast(runId, event)),
  });

  return c.json({ runId, attachments: attachmentMeta });
});

app.get("/lookup/sessions/:sessionId/events", (c) => {
  const authHeader = c.req.header("authorization");
  const authQuery = c.req.query("auth");
  const provided = authHeader?.replace("Bearer ", "") ?? authQuery;
  if (provided !== token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const sessionId = c.req.param("sessionId");
  const runId = c.req.query("runId") ?? lookupSessionRunId.get(sessionId);

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
  run.abortController?.abort();

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

app.post("/workspace/issue-terminal-directory", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    projectsPath?: string;
    projectName?: string;
    issueIdentifier?: string;
  };
  const projectsPath = body.projectsPath?.trim() || "";
  const projectName = body.projectName?.trim() || "";
  const issueIdentifier = body.issueIdentifier?.trim() || "";

  if (!projectsPath || !projectName || !issueIdentifier) {
    return c.json(
      { error: "projectsPath, projectName, and issueIdentifier are required" },
      400,
    );
  }

  const folderName = buildIssueWorkspaceRelativePath(projectName, issueIdentifier);
  const path = join(projectsPath, folderName);

  try {
    mkdirSync(path, { recursive: true });
    return c.json({ path, folderName });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to prepare issue terminal directory";
    return c.json({ error: message }, 500);
  }
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

app.get("/tts/voices", async (c) => {
  const tts = await loadTtsModule();
  if (!tts.isTtsAvailable()) {
    return c.json({ error: "TTS is not available. Run npm run download:tts." }, 503);
  }
  return c.json({ voices: tts.listTtsVoices() });
});

app.post("/tts/speak", async (c) => {
  const tts = await loadTtsModule();
  if (!tts.isTtsAvailable()) {
    return c.json({ error: "TTS is not available. Run npm run download:tts." }, 503);
  }

  const body = await c.req.json<{ text?: string; voiceId?: string }>();
  const text = body.text?.trim();
  if (!text) {
    return c.json({ error: "text is required" }, 400);
  }

  const voices = tts.listTtsVoices();
  const voiceId = body.voiceId ?? tts.DEFAULT_VOICE_ID;
  if (!voices.some((voice) => voice.id === voiceId)) {
    return c.json({ error: `Unknown voice: ${voiceId}` }, 400);
  }

  try {
    const audio = await tts.synthesizeSpeech(text, voiceId);
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

app.post("/tts/stop", async (c) => {
  const tts = await loadTtsModule();
  tts.stopSpeech();
  return c.json({ ok: true });
});

app.post("/tts/warmup", async (c) => {
  const tts = await loadTtsModule();
  if (!tts.isTtsAvailable()) {
    return c.json({ error: "TTS is not available. Run npm run download:tts." }, 503);
  }

  const body = await c.req.json<{ voiceId?: string }>().catch(() => ({ voiceId: undefined }));
  const voiceId = body.voiceId ?? tts.DEFAULT_VOICE_ID;

  try {
    await tts.warmupSpeech(voiceId);
    return c.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TTS warmup failed";
    return c.json({ error: message }, 500);
  }
});

app.get("/stt/status", async (c) => {
  const stt = await loadSttModule();
  if (!stt.isSttAvailable()) {
    return c.json({ error: "STT is not available. Run npm run download:stt." }, 503);
  }

  return c.json({
    available: true,
    ready: stt.isSttReady(),
    modelId: stt.getSttModelId(),
  });
});

app.post("/stt/warmup", async (c) => {
  const stt = await loadSttModule();
  if (!stt.isSttAvailable()) {
    return c.json({ error: "STT is not available. Run npm run download:stt." }, 503);
  }

  try {
    await stt.warmupStt();
    return c.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "STT warmup failed";
    return c.json({ error: message }, 500);
  }
});

app.post("/stt/transcribe", async (c) => {
  const stt = await loadSttModule();
  if (!stt.isSttAvailable()) {
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
    const text = await stt.transcribeAudio(pcm);
    return c.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Speech transcription failed";
    return c.json({ error: message }, 500);
  }
});

const ready: ReadyMessage = { type: "ready", port, token };
console.log(JSON.stringify(ready));

ensureAgentProfile();
ensureUserProfile();

void refreshMaxModelCache().catch(() => {
  // Fall back to MAX_MODEL_ID_FALLBACK when the model list is unavailable.
});

linearWatcherOrchestrator.start();

export default {
  port,
  hostname: "127.0.0.1",
  idleTimeout: 255,
  fetch: app.fetch,
};
