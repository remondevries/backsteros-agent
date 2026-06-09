import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AppSettings } from "./types.ts";
import { getDataDir } from "./config.ts";

const DEFAULT_SETTINGS: AppSettings = {
  notesPath: null,
  agentId: null,
  agentIdByNotesPath: {},
  modelId: null,
  modelMode: "auto",
  issueLinkMode: "external",
};

function settingsPath(): string {
  const dir = getDataDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return join(dir, "settings.json");
}

export function loadSettings(): AppSettings {
  const path = settingsPath();
  if (!existsSync(path)) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as AppSettings;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  writeFileSync(settingsPath(), JSON.stringify(settings, null, 2));
}

export function getAgentIdForPath(
  settings: AppSettings,
  notesPath: string,
): string | null {
  return settings.agentIdByNotesPath[notesPath] ?? null;
}

export function setAgentIdForPath(
  settings: AppSettings,
  notesPath: string,
  agentId: string,
): AppSettings {
  const next = {
    ...settings,
    notesPath,
    agentId,
    agentIdByNotesPath: {
      ...settings.agentIdByNotesPath,
      [notesPath]: agentId,
    },
  };
  saveSettings(next);
  return next;
}
