import { Cursor } from "@cursor/sdk";
import { getCursorApiKey } from "./config.ts";

const DEFAULT_VALIDATION_TIMEOUT_MS = 2_500;
const VALIDITY_CACHE_TTL_MS = 60_000;

type ValidityCacheEntry = {
  valid: boolean;
  checkedAt: number;
};

let validityCache: ValidityCacheEntry | null = null;

export function invalidateCursorApiKeyValidityCache(): void {
  validityCache = null;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    }),
  ]);
}

export function cursorApiKeyErrorStatus(message: string): 401 | 503 {
  const lower = message.toLowerCase();
  if (
    lower.includes("invalid user api key") ||
    lower.includes("cursor_api_key is not set") ||
    lower.includes("api key is not configured") ||
    lower.includes("unauthorized") ||
    lower.includes("invalid api key")
  ) {
    return 401;
  }
  return 503;
}

export function cursorApiKeyErrorResponse(message: string): { status: 401 | 503; body: { error: string } } {
  return {
    status: cursorApiKeyErrorStatus(message),
    body: { error: message },
  };
}

export async function checkCursorApiKeyValidity(
  apiKeyOverride?: string,
  timeoutMs = DEFAULT_VALIDATION_TIMEOUT_MS,
): Promise<boolean | null> {
  const apiKey = apiKeyOverride?.trim() || getCursorApiKey()?.trim();
  if (!apiKey) {
    return null;
  }

  if (
    !apiKeyOverride &&
    validityCache &&
    Date.now() - validityCache.checkedAt < VALIDITY_CACHE_TTL_MS
  ) {
    return validityCache.valid;
  }

  try {
    const models = await withTimeout(
      Cursor.models.list({ apiKey }),
      timeoutMs,
      "Cursor API key validation",
    );
    const valid = Array.isArray(models) && models.length > 0;
    if (!apiKeyOverride) {
      validityCache = { valid, checkedAt: Date.now() };
    }
    return valid;
  } catch {
    if (!apiKeyOverride) {
      validityCache = { valid: false, checkedAt: Date.now() };
    }
    return false;
  }
}
