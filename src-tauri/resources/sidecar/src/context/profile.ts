import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { getUserProfilePath } from "../config.ts";
import { readCachedFileContent } from "./cache.ts";
import { loadMarkdownContextFile } from "./markdown.ts";

export const DEFAULT_USER_PROFILE = `# User profile

BacksterOS Agent reads this file on every turn for identity and timezone context.
Edit the fields below to match you.

- Name: Remon de Vries
- Timezone: Europe/Amsterdam
- City: Leeuwarden, Netherlands
- Role: Software engineer; runs Lemo-Design agency
`;

const TIMEZONE_LINE = /^-\s*Timezone:\s*(.+)$/i;
const CITY_LINE = /^-\s*City:\s*(.+)$/i;
const NAME_LINE = /^-\s*Name:\s*(.+)$/i;

export function ensureUserProfile(): void {
  const path = getUserProfilePath();
  if (existsSync(path)) {
    return;
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, DEFAULT_USER_PROFILE, "utf8");
}

export function parseCityFromProfileContent(content: string): string | null {
  for (const line of content.split("\n")) {
    const match = line.trim().match(CITY_LINE);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
}

export function parseNameFromProfileContent(content: string): string | null {
  for (const line of content.split("\n")) {
    const match = line.trim().match(NAME_LINE);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
}

export function loadUserCity(): string | null {
  const content = readCachedFileContent(getUserProfilePath());
  if (!content) return null;
  return parseCityFromProfileContent(content);
}

export function loadUserFirstName(): string | null {
  const content = readCachedFileContent(getUserProfilePath());
  if (!content) return null;
  const name = parseNameFromProfileContent(content);
  if (!name) return null;
  return name.split(/\s+/)[0] ?? name;
}

export function parseTimezoneFromProfileContent(content: string): string | null {
  for (const line of content.split("\n")) {
    const match = line.trim().match(TIMEZONE_LINE);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
}

export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export function loadUserTimezone(): string {
  const content = readCachedFileContent(getUserProfilePath());
  if (!content) {
    return "UTC";
  }

  const timezone = parseTimezoneFromProfileContent(content);
  if (timezone && isValidTimezone(timezone)) {
    return timezone;
  }

  return "UTC";
}

export function loadUserIdentityContext(): string | null {
  return loadMarkdownContextFile(getUserProfilePath(), {
    header: "[User]",
    footerLines: [
      '- Interpret "today", scheduling, and daily notes in the user\'s timezone unless they say otherwise.',
    ],
  });
}
