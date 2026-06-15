import { isLinearOAuthAuthenticated } from "../config.ts";
import { isLinearAuthErrorMessage } from "./auth-errors.ts";
import { fetchLinearViewer } from "./viewer.ts";

const VALID_CACHE_MS = 5 * 60 * 1000;
const INVALID_CACHE_MS = 30 * 1000;

let accessCache: { checkedAt: number; valid: boolean } | null = null;

export function clearLinearOAuthAccessCache(): void {
  accessCache = null;
}

export async function isLinearOAuthAccessValid(): Promise<boolean> {
  if (!isLinearOAuthAuthenticated()) {
    accessCache = null;
    return false;
  }

  const now = Date.now();
  if (accessCache) {
    const ttl = accessCache.valid ? VALID_CACHE_MS : INVALID_CACHE_MS;
    if (now - accessCache.checkedAt < ttl) {
      return accessCache.valid;
    }
  }

  try {
    await fetchLinearViewer();
    accessCache = { checkedAt: now, valid: true };
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (isLinearAuthErrorMessage(message)) {
      accessCache = { checkedAt: now, valid: false };
      return false;
    }
    return true;
  }
}
