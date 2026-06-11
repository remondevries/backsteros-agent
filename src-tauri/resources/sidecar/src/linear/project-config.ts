import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type LinearWorkflowConfig = {
  teamId: string;
  stateIds: {
    readyToStart: string;
    inProgress: string;
  };
  defaults: {
    priority: number;
    assigneeId: string;
  };
};

let cachedConfig: LinearWorkflowConfig | null = null;

function resolveProjectConfigPath(): string | null {
  const candidates = [
    join(process.cwd(), "agent/project.config.json"),
    join(dirname(import.meta.dir), "..", "agent/project.config.json"),
    join(dirname(import.meta.dir), "..", "..", "agent/project.config.json"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function loadLinearWorkflowConfig(): LinearWorkflowConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const path = resolveProjectConfigPath();
  if (!path) {
    throw new Error("agent/project.config.json was not found");
  }

  const parsed = JSON.parse(readFileSync(path, "utf8")) as {
    linear?: {
      team?: { id?: string };
      states?: {
        readyToStart?: { id?: string };
        inProgress?: { id?: string };
      };
      defaults?: {
        priority?: number;
        assigneeId?: string;
      };
    };
  };

  const teamId = parsed.linear?.team?.id?.trim();
  const readyToStart = parsed.linear?.states?.readyToStart?.id?.trim();
  const inProgress = parsed.linear?.states?.inProgress?.id?.trim();
  const assigneeId = parsed.linear?.defaults?.assigneeId?.trim();
  const priority = parsed.linear?.defaults?.priority;

  if (!teamId || !readyToStart || !inProgress || !assigneeId || priority == null) {
    throw new Error("Linear workflow config is incomplete in agent/project.config.json");
  }

  cachedConfig = {
    teamId,
    stateIds: { readyToStart, inProgress },
    defaults: { priority, assigneeId },
  };

  return cachedConfig;
}

export function resetLinearWorkflowConfigCache(): void {
  cachedConfig = null;
}
