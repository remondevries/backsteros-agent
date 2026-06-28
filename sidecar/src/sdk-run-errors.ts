import { getDefaultSdkStateRoot } from "@cursor/sdk";
import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { join } from "node:path";

export function readLocalSdkRunErrorCode(
  notesPath: string,
  sdkRunId: string,
): string | null {
  const dbPath = join(getDefaultSdkStateRoot(notesPath), "index.db");
  if (!existsSync(dbPath)) {
    return null;
  }

  const db = new Database(dbPath);
  try {
    const row = db
      .query("SELECT error_code FROM runs WHERE run_id = ?")
      .get(sdkRunId) as { error_code: string | null } | null;
    const code = row?.error_code?.trim();
    return code || null;
  } finally {
    db.close();
  }
}

function isGenericSdkFailureMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return (
    normalized === "agent run error" ||
    normalized === "run failed" ||
    normalized === "agent run failed"
  );
}

export function formatSdkRunErrorCode(errorCode: string): string | null {
  const normalized = errorCode.trim();
  if (!normalized || isGenericSdkFailureMessage(normalized)) {
    return null;
  }

  const lower = normalized.toLowerCase();
  if (lower.includes("out of usage") || lower.includes("increase limits")) {
    return "Your Cursor API usage limit is exhausted. In Cursor, switch to Auto mode or ask your admin to raise your limit, then try again.";
  }

  if (lower.includes("unsupported content type") && lower.includes("event-stream")) {
    return "The agent stream failed to connect. Try again in a moment.";
  }

  const stripped = normalized.replace(/^\[[^\]]+\]\s*/, "").trim();
  if (stripped && !isGenericSdkFailureMessage(stripped)) {
    return stripped;
  }

  return null;
}
