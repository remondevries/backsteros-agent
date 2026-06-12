import { readFileSync } from "node:fs";
import { join } from "node:path";
import { splitFrontmatter } from "../daily-note.ts";

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

export function renderFrontmatter(fields: Map<string, string>): string {
  const lines = ["---"];
  for (const [key, value] of fields.entries()) {
    lines.push(`${key}: ${value}`);
  }
  lines.push("---");
  return lines.join("\n");
}

export function ensureDocumentDateFrontmatter(frontmatter: string | null, date: string): string {
  const fields = frontmatter ? parseFrontmatterFields(frontmatter) : new Map<string, string>();
  if (!fields.has("date")) {
    fields.set("date", date);
  }
  return renderFrontmatter(fields);
}

export function readVaultNoteDateFromContent(content: string): string | null {
  const { frontmatter } = splitFrontmatter(content);
  if (!frontmatter) return null;

  const dateRaw = unquoteYamlValue(parseFrontmatterFields(frontmatter).get("date") ?? "");
  return dateRaw || null;
}

export function readVaultNoteDate(notesPath: string, relativePath: string): string | null {
  const abs = join(notesPath, relativePath);
  const content = readFileSync(abs, "utf8");
  return readVaultNoteDateFromContent(content);
}
