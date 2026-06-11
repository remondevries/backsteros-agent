import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { getAgentProfilePath, getUserProfilePath } from "./config.ts";
import { ensureAgentProfile } from "./context/agent.ts";
import { ensureUserProfile } from "./context/profile.ts";
import { invalidateContextCache, readCachedFileContent } from "./context/cache.ts";

export type ProfileKind = "user" | "agent";

function profilePath(kind: ProfileKind): string {
  return kind === "user" ? getUserProfilePath() : getAgentProfilePath();
}

function ensureProfile(kind: ProfileKind): void {
  if (kind === "user") {
    ensureUserProfile();
    return;
  }
  ensureAgentProfile();
}

export function readProfileContent(kind: ProfileKind): string {
  ensureProfile(kind);
  const path = profilePath(kind);
  const content = readCachedFileContent(path);
  if (content === null) {
    throw new Error(`Failed to read ${kind} profile`);
  }
  return content;
}

export function writeProfileContent(kind: ProfileKind, content: string): string {
  ensureProfile(kind);
  const path = profilePath(kind);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  invalidateContextCache(path);
  return content;
}

export function parseProfileKind(value: string | undefined): ProfileKind | null {
  if (value === "user" || value === "agent") {
    return value;
  }
  return null;
}
