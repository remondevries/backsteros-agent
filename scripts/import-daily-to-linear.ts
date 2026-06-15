#!/usr/bin/env bun
/**
 * One-time import: Obsidian Daily/*.md → Linear team documents (title = YYYY-MM-DD).
 *
 * Usage (from repo root, requires Linear OAuth token in ~/.backsteros-agent/.env):
 *   bun scripts/import-daily-to-linear.ts --dry-run
 *   bun scripts/import-daily-to-linear.ts
 *   bun scripts/import-daily-to-linear.ts --from-date 2026-03-28
 *
 * Options:
 *   --dry-run           Print actions only; no Linear writes
 *   --update-existing   Overwrite Linear document content when title already exists
 *   --team-id <uuid>    Linear team (default: f2ddb43d-f795-4997-a884-8046780aa127)
 *   --daily-dir <path>  Obsidian Daily folder
 *   --from-date <iso>   Only import on/after YYYY-MM-DD
 *   --to-date <iso>     Only import on/before YYYY-MM-DD
 *   --limit <n>         Import at most n files (sorted by date)
 *   --delay-ms <n>      Pause between API calls (default: 800)
 *   --quiet-skips       Do not log skipped dates
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import {
  ensureDailyNoteJournalStructure,
  isDailyJournalDocumentTitle,
  splitFrontmatter,
} from "../sidecar/src/daily-note.ts";
import { getLinearAuthToken } from "../sidecar/src/linear/auth-token.ts";
import {
  createLinearApiTeamDocument,
  fetchLinearApiTeamDocuments,
  updateLinearApiDocument,
} from "../sidecar/src/linear/project-documents-api.ts";
import { linearGraphqlRequest } from "../sidecar/src/linear/graphql.ts";

const DEFAULT_TEAM_ID = "f2ddb43d-f795-4997-a884-8046780aa127";
const DEFAULT_DAILY_DIR = "/Users/remondevries/Obsidian/Vault/Daily";
const DEFAULT_DELAY_MS = 800;
const MAX_RETRIES = 8;
const INITIAL_RETRY_MS = 15_000;

const DAILY_FILE_PATTERN = /^(\d{4}-\d{2}-\d{2})\.md$/;

function parseArgs(argv: string[]) {
  let dryRun = false;
  let updateExisting = false;
  let teamId = DEFAULT_TEAM_ID;
  let dailyDir = DEFAULT_DAILY_DIR;
  let limit: number | null = null;
  let delayMs = DEFAULT_DELAY_MS;
  let fromDate: string | null = null;
  let toDate: string | null = null;
  let quietSkips = false;

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--update-existing") {
      updateExisting = true;
      continue;
    }
    if (arg === "--team-id") {
      teamId = argv[++index]?.trim() ?? teamId;
      continue;
    }
    if (arg === "--daily-dir") {
      dailyDir = argv[++index]?.trim() ?? dailyDir;
      continue;
    }
    if (arg === "--limit") {
      const parsed = Number.parseInt(argv[++index] ?? "", 10);
      if (Number.isFinite(parsed) && parsed > 0) limit = parsed;
      continue;
    }
    if (arg === "--delay-ms") {
      const parsed = Number.parseInt(argv[++index] ?? "", 10);
      if (Number.isFinite(parsed) && parsed >= 0) delayMs = parsed;
      continue;
    }
    if (arg === "--from-date") {
      fromDate = argv[++index]?.trim() ?? fromDate;
      continue;
    }
    if (arg === "--to-date") {
      toDate = argv[++index]?.trim() ?? toDate;
      continue;
    }
    if (arg === "--quiet-skips") {
      quietSkips = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(`Usage: bun scripts/import-daily-to-linear.ts [options]

  --dry-run           Print actions only; no Linear writes
  --update-existing   Overwrite when a YYYY-MM-DD document already exists
  --team-id <uuid>    Default: ${DEFAULT_TEAM_ID}
  --daily-dir <path>  Default: ${DEFAULT_DAILY_DIR}
  --from-date <iso>   Only import on/after YYYY-MM-DD
  --to-date <iso>     Only import on/before YYYY-MM-DD
  --limit <n>         Import at most n files (by date)
  --delay-ms <n>      Pause between writes (default: ${DEFAULT_DELAY_MS})
  --quiet-skips       Hide skip lines for dates already in Linear`);
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { dryRun, updateExisting, teamId, dailyDir, limit, delayMs, fromDate, toDate, quietSkips };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripLeadingTitleHeading(body: string, date: string): string {
  const escaped = date.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return body.replace(new RegExp(`^#\\s+${escaped}\\s*\\n*`, "m"), "").trimStart();
}

/** Map Obsidian daily note file content to Linear document markdown (body only). */
export function dailyVaultFileToLinearContent(raw: string, date: string): string {
  const structured = ensureDailyNoteJournalStructure(raw, date);
  const { body } = splitFrontmatter(structured);
  const withoutTitle = stripLeadingTitleHeading(body.trimEnd(), date);
  return withoutTitle.trimEnd();
}

function listDailyVaultFiles(dailyDir: string): Array<{ date: string; path: string }> {
  const entries = readdirSync(dailyDir, { withFileTypes: true });
  const files: Array<{ date: string; path: string }> = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const match = DAILY_FILE_PATTERN.exec(entry.name);
    if (!match) continue;
    const date = match[1]!;
    if (!isDailyJournalDocumentTitle(date)) continue;
    files.push({ date, path: join(dailyDir, entry.name) });
  }

  return files.sort((left, right) => left.date.localeCompare(right.date));
}

async function assertTeamExists(teamId: string): Promise<string> {
  const data = await linearGraphqlRequest<{
    team?: { id?: string; name?: string; key?: string } | null;
  }>(
    `query ImportDailyTeam($id: String!) { team(id: $id) { id name key } }`,
    { id: teamId },
  );
  const team = data.team;
  if (!team?.id?.trim()) {
    throw new Error(`Linear team not found: ${teamId}`);
  }
  const label = [team.key, team.name].filter(Boolean).join(" · ") || team.id;
  return label;
}

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /quota exceeded|rate limit|429|too many requests/i.test(message);
}

async function withRateLimitRetry<T>(label: string, action: () => Promise<T>): Promise<T> {
  let attempt = 0;
  let waitMs = INITIAL_RETRY_MS;

  while (true) {
    try {
      return await action();
    } catch (error) {
      attempt += 1;
      if (!isRateLimitError(error) || attempt > MAX_RETRIES) {
        throw error;
      }
      console.warn(`${label} rate limited — retry ${attempt}/${MAX_RETRIES} in ${Math.round(waitMs / 1000)}s`);
      await sleep(waitMs);
      waitMs = Math.min(waitMs * 2, 120_000);
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!getLinearAuthToken()) {
    throw new Error(
      "Linear is not connected. Open BacksterOS Settings and connect Linear, or set a token in ~/.backsteros-agent/.env",
    );
  }

  const files = listDailyVaultFiles(options.dailyDir).filter((file) => {
    if (options.fromDate && file.date < options.fromDate) return false;
    if (options.toDate && file.date > options.toDate) return false;
    return true;
  });
  if (files.length === 0) {
    throw new Error(`No daily notes found in ${options.dailyDir}`);
  }

  const selected = options.limit != null ? files.slice(0, options.limit) : files;
  const teamLabel = options.dryRun
    ? options.teamId
    : await assertTeamExists(options.teamId);

  console.log(`Daily folder: ${options.dailyDir}`);
  console.log(`Linear team:  ${teamLabel} (${options.teamId})`);
  console.log(`Files:        ${selected.length} of ${files.length}`);
  console.log(`Mode:         ${options.dryRun ? "dry-run" : options.updateExisting ? "create + update" : "create (skip existing)"}`);
  console.log("");

  const existingByTitle = new Map<string, string>();
  if (!options.dryRun) {
    console.log("Fetching existing Linear daily documents…");
    const existing = await fetchLinearApiTeamDocuments(options.teamId);
    for (const document of existing) {
      const title = document.title.trim();
      if (isDailyJournalDocumentTitle(title)) {
        existingByTitle.set(title, document.id);
      }
    }
    console.log(`Found ${existingByTitle.size} existing YYYY-MM-DD documents on team.\n`);
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const [index, file] of selected.entries()) {
    const raw = readFileSync(file.path, "utf8");
    const content = dailyVaultFileToLinearContent(raw, file.date);
    const existingId = existingByTitle.get(file.date);

    const prefix = `[${index + 1}/${selected.length}] ${file.date}`;

    if (existingId && !options.updateExisting) {
      skipped += 1;
      if (!options.quietSkips) {
        console.log(`${prefix} skip (already in Linear)`);
      }
      continue;
    }

    if (options.dryRun) {
      const preview = content.replace(/\s+/g, " ").slice(0, 80);
      console.log(`${prefix} ${existingId ? "would update" : "would create"} (${content.length} chars) ${preview ? `— ${preview}` : ""}`);
      continue;
    }

    try {
      if (existingId) {
        await withRateLimitRetry(prefix, () => updateLinearApiDocument(existingId, { content }));
        updated += 1;
        console.log(`${prefix} updated`);
      } else {
        const document = await withRateLimitRetry(prefix, () =>
          createLinearApiTeamDocument(options.teamId, file.date, content),
        );
        existingByTitle.set(file.date, document.id);
        created += 1;
        console.log(`${prefix} created (${document.id})`);
      }
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${prefix} FAILED — ${message}`);
    }

    if (options.delayMs > 0 && index < selected.length - 1) {
      await sleep(options.delayMs);
    }
  }

  console.log("");
  if (options.dryRun) {
    console.log(`Dry run complete. ${selected.length} file(s) inspected.`);
    return;
  }

  console.log(`Done. created=${created} updated=${updated} skipped=${skipped} failed=${failed}`);
  if (failed > 0) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
