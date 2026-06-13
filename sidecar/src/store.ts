import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AppSettings } from "./types.ts";
import { getDataDir } from "./config.ts";

const DEFAULT_SETTINGS: AppSettings = {
  notesPath: null,
  agentId: null,
  agentIdByNotesPath: {},
  modelId: null,
  modelMode: "auto",
  executionMode: "live",
  issueLinkMode: "external",
  groceryLinearProjectId: null,
  linearProjectWatchers: {},
};

let cachedSettings: AppSettings | null = null;
let cachedSettingsMtime: number | null = null;

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
    cachedSettings = { ...DEFAULT_SETTINGS };
    cachedSettingsMtime = null;
    return cachedSettings;
  }

  try {
    const mtime = statSync(path).mtimeMs;
    if (cachedSettings && cachedSettingsMtime === mtime) {
      return cachedSettings;
    }

    const parsed = JSON.parse(readFileSync(path, "utf8")) as AppSettings;
    cachedSettings = { ...DEFAULT_SETTINGS, ...parsed };
    cachedSettingsMtime = mtime;
    return cachedSettings;
  } catch {
    cachedSettings = { ...DEFAULT_SETTINGS };
    cachedSettingsMtime = null;
    return cachedSettings;
  }
}

export function saveSettings(settings: AppSettings): void {
  const path = settingsPath();
  writeFileSync(path, JSON.stringify(settings, null, 2));
  cachedSettings = { ...settings };
  try {
    cachedSettingsMtime = statSync(path).mtimeMs;
  } catch {
    cachedSettingsMtime = null;
  }
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
