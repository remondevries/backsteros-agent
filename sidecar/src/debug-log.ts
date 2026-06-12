import { appendFileSync } from "node:fs";

const DEBUG_LOG_PATH = "/Users/remondevries/code/backsteros-agent/.cursor/debug-49b1ec.log";

export function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
) {
  try {
    appendFileSync(
      DEBUG_LOG_PATH,
      `${JSON.stringify({
        sessionId: "49b1ec",
        location,
        message,
        data,
        hypothesisId,
        timestamp: Date.now(),
      })}\n`,
    );
  } catch {
    // Ignore logging failures.
  }
}
