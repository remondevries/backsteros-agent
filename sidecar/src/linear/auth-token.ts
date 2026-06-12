import { getLinearApiKey } from "../config.ts";
import { getLinearOAuthAccessToken } from "../linearOAuth.ts";

export function getLinearAuthToken(): string | undefined {
  return getLinearApiKey() || getLinearOAuthAccessToken();
}

export function linearAuthorizationHeader(token: string): string {
  const trimmed = token.trim();
  if (trimmed.startsWith("Bearer ")) return trimmed;
  if (trimmed.startsWith("lin_")) return trimmed;
  return `Bearer ${trimmed}`;
}
