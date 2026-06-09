import type { MarkdownFileEntity, StructuredPayload } from "../types.ts";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function enrichNotesResult(
  toolName: string,
  result: unknown,
): StructuredPayload | undefined {
  const items: MarkdownFileEntity[] = [];
  const lower = toolName.toLowerCase();

  const addPath = (path: unknown) => {
    if (typeof path !== "string" || !path.trim()) return;
    items.push({
      path,
      title: path.split("/").pop() ?? path,
    });
  };

  const record = asRecord(result);
  if (record) {
    addPath(record.path);
    addPath(record.file_path);
    addPath(record.target_file);
    if (Array.isArray(record.files)) {
      for (const file of record.files) {
        if (typeof file === "string") addPath(file);
        else addPath(asRecord(file)?.path);
      }
    }
  }

  if (typeof result === "string") {
    const pathMatch = result.match(/(?:^|\s)([\w./-]+\.md)\b/i);
    if (pathMatch) addPath(pathMatch[1]);
  }

  if (items.length === 0) return undefined;

  if (lower.includes("write") || lower.includes("edit")) {
    const first = items[0];
    return {
      type: "file_diff",
      path: first.path,
      summary: `Updated ${first.title ?? first.path}`,
    };
  }

  return { type: "markdown_files", items };
}
