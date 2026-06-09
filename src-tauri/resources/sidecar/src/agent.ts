import { Agent, CursorAgentError, type ModelSelection, type Run, type SDKAgent } from "@cursor/sdk";
import { existsSync, mkdirSync } from "node:fs";
import { getCursorApiKey } from "./config.ts";
import { getSelectedModelSelection } from "./models.ts";
import {
  getSessionAgentId,
  updateSessionAgentId,
} from "./sessions.ts";
import { loadSettings } from "./store.ts";

const sessionAgents = new Map<string, SDKAgent>();

function requireApiKey(): string {
  const apiKey = getCursorApiKey();
  if (!apiKey) {
    throw new CursorAgentError("CURSOR_API_KEY is not set", {
      isRetryable: false,
    });
  }
  return apiKey;
}

function ensureNotesDir(notesPath: string): void {
  if (!existsSync(notesPath)) {
    mkdirSync(notesPath, { recursive: true });
  }
}

async function createAgentForSession(
  sessionId: string,
  notesPath: string,
): Promise<SDKAgent> {
  ensureNotesDir(notesPath);
  const apiKey = requireApiKey();
  const settings = loadSettings();
  const model = getSelectedModelSelection(settings);

  // Runtime guidance is injected per message (see prompt.ts / context/). Keep the
  // agent baseline lean by not auto-loading project AGENTS.md on every turn.
  const agent = await Agent.create({
    apiKey,
    model,
    local: {
      cwd: notesPath,
    },
  });

  updateSessionAgentId(sessionId, agent.agentId);
  sessionAgents.set(sessionId, agent);
  return agent;
}

async function resumeAgentForSession(
  sessionId: string,
  notesPath: string,
  agentId: string,
): Promise<SDKAgent> {
  ensureNotesDir(notesPath);
  const apiKey = requireApiKey();
  const settings = loadSettings();
  const model = getSelectedModelSelection(settings);

  const agent = await Agent.resume(agentId, {
    apiKey,
    model,
    local: {
      cwd: notesPath,
    },
  });

  sessionAgents.set(sessionId, agent);
  return agent;
}

export async function ensureAgentForSession(
  sessionId: string,
  notesPath: string,
): Promise<SDKAgent> {
  const existing = sessionAgents.get(sessionId);
  if (existing) {
    return existing;
  }

  const storedAgentId = getSessionAgentId(sessionId);
  if (storedAgentId) {
    try {
      return await resumeAgentForSession(sessionId, notesPath, storedAgentId);
    } catch {
      return createAgentForSession(sessionId, notesPath);
    }
  }

  return createAgentForSession(sessionId, notesPath);
}

export async function createAgentForSessionRecord(
  sessionId: string,
  notesPath: string,
): Promise<SDKAgent> {
  return createAgentForSession(sessionId, notesPath);
}

export async function createEphemeralAgent(
  notesPath: string,
  model?: ModelSelection,
): Promise<SDKAgent> {
  ensureNotesDir(notesPath);
  const apiKey = requireApiKey();
  const selectedModel = model ?? getSelectedModelSelection(loadSettings());

  return Agent.create({
    apiKey,
    model: selectedModel,
    local: {
      cwd: notesPath,
    },
  });
}

export async function sendPolishPrompt(
  agent: SDKAgent,
  prompt: string,
  model: ModelSelection,
): Promise<Run> {
  try {
    return await agent.send(prompt, { model, mcpServers: {} });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already has active run/i.test(message)) {
      throw error;
    }

    return await agent.send(prompt, {
      model,
      mcpServers: {},
      local: { force: true },
    });
  }
}

export async function disposeEphemeralAgent(agent: SDKAgent): Promise<void> {
  await agent[Symbol.asyncDispose]?.();
}

export async function resetSessionAgent(
  sessionId: string,
  notesPath: string,
): Promise<SDKAgent> {
  await disposeSessionAgent(sessionId);
  return createAgentForSession(sessionId, notesPath);
}

export async function disposeSessionAgent(sessionId: string): Promise<void> {
  const agent = sessionAgents.get(sessionId);
  if (agent) {
    await agent[Symbol.asyncDispose]?.();
    sessionAgents.delete(sessionId);
  }
}

export async function disposeAllSessionAgents(): Promise<void> {
  for (const sessionId of [...sessionAgents.keys()]) {
    await disposeSessionAgent(sessionId);
  }
}

export async function resetAgentsForNotesPath(): Promise<void> {
  for (const sessionId of [...sessionAgents.keys()]) {
    await disposeSessionAgent(sessionId);
  }
}

export { CursorAgentError };
