import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readDailyNoteStats, splitFrontmatter, type DailyNoteStats } from "../daily-note.ts";
import { readVaultNoteDateFromContent } from "./vault-frontmatter.ts";

export type VaultNoteWhoopStats = {
  sleep: number | null;
  recovery: number | null;
  strain: number | null;
};

const DAILY_NOTE_PATH_PATTERN = /^Daily\/(\d{4}-\d{2}-\d{2})\.md$/i;

function parseFrontmatterFields(frontmatter: string): Map<string, string> {
  const fields = new Map<string, string>();
  const lines = frontmatter.split("\n");
  const closeIndex = lines.lastIndexOf("---");

  for (const line of lines.slice(1, closeIndex)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) {
      fields.set(match[1]!, match[2] ?? "");
    }
  }

  return fields;
}

function unquoteYamlValue(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontmatterNumber(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = unquoteYamlValue(value).trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeWhoopLookupDate(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  let trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1);
  }
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  return match?.[1] ?? null;
}

export function resolveVaultNoteDate(relativePath: string, content: string): string | null {
  const fromFrontmatter = normalizeWhoopLookupDate(readVaultNoteDateFromContent(content));
  if (fromFrontmatter) return fromFrontmatter;

  const normalizedPath = relativePath.replace(/\\/g, "/");
  const match = DAILY_NOTE_PATH_PATTERN.exec(normalizedPath);
  return match?.[1] ?? null;
}

export function readWhoopStatsFromContent(content: string): VaultNoteWhoopStats | null {
  const { frontmatter } = splitFrontmatter(content);
  if (!frontmatter) return null;

  const fields = parseFrontmatterFields(frontmatter);
  const stats: VaultNoteWhoopStats = {
    sleep: parseFrontmatterNumber(fields.get("sleep")),
    recovery: parseFrontmatterNumber(fields.get("recovery")),
    strain: parseFrontmatterNumber(fields.get("strain")),
  };

  return hasWhoopMetrics(stats) ? stats : null;
}

export function hasWhoopMetrics(stats: VaultNoteWhoopStats | DailyNoteStats | null): boolean {
  if (!stats) return false;
  return stats.sleep != null || stats.recovery != null || stats.strain != null;
}

export function toVaultNoteWhoopStats(stats: DailyNoteStats): VaultNoteWhoopStats {
  return {
    sleep: stats.sleep,
    recovery: stats.recovery,
    strain: stats.strain,
  };
}

export function resolveVaultNoteWhoopStats(
  notesPath: string,
  relativePath: string,
): { date: string | null; whoop: VaultNoteWhoopStats | null } {
  const content = readFileSync(join(notesPath, relativePath), "utf8");
  const date = resolveVaultNoteDate(relativePath, content);
  const ownStats = readWhoopStatsFromContent(content);
  if (ownStats) {
    return { date, whoop: ownStats };
  }

  if (!date) {
    return { date: null, whoop: null };
  }

  const dailyStats = readDailyNoteStats(notesPath, date);
  if (!dailyStats || !hasWhoopMetrics(dailyStats)) {
    return { date, whoop: null };
  }

  return { date, whoop: toVaultNoteWhoopStats(dailyStats) };
}
