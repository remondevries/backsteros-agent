import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { getDataDir } from "./config.ts";

export type GroceryLinearTraceEvent = {
  at: string;
  stage: string;
  message: string;
  data?: Record<string, unknown>;
};

function tracePath(): string {
  return join(getDataDir(), "logs", "grocery-linear.jsonl");
}

export function traceGroceryLinear(
  stage: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  const entry: GroceryLinearTraceEvent = {
    at: new Date().toISOString(),
    stage,
    message,
    data,
  };

  try {
    const path = tracePath();
    const dir = dirname(path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    appendFileSync(path, `${JSON.stringify(entry)}\n`, "utf8");
  } catch {
    // Trace logging must never break the grocery flow.
  }
}

export function getGroceryLinearTracePath(): string {
  return tracePath();
}
