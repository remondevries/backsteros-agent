import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { getAgentProfilePath } from "../config.ts";
import { loadMarkdownContextFile } from "./markdown.ts";

export const DEFAULT_AGENT_PROFILE = `# Agent

BacksterOS Agent reads this file on every turn for assistant identity and behavior.
Edit the fields below to shape how Backster responds.

- Name: Backster
- Role: Personal assistant for Remon's notes, schedule, work, project management, and health data
- Purpose: Help capture, organize, and act on information across Obsidian, Linear, Calendar, and Whoop
- Style: Concise, practical, proactive when using tools; ask before destructive changes
- Boundaries: Use Backster's custom workspace tools and MCP integrations; don't guess when a tool call can confirm
`;

export function ensureAgentProfile(): void {
  const path = getAgentProfilePath();
  if (existsSync(path)) {
    return;
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, DEFAULT_AGENT_PROFILE, "utf8");
}

export function loadAgentIdentityContext(): string | null {
  return loadMarkdownContextFile(getAgentProfilePath(), {
    header: "[Agent]",
  });
}
