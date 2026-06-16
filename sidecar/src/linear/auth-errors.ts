export function isLinearAuthErrorMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("authentication required") ||
    lower.includes("not authenticated") ||
    lower.includes("invalid token") ||
    lower.includes("unauthorized")
  );
}

export function formatLinearAuthErrorMessage(message: string): string {
  if (isLinearAuthErrorMessage(message)) {
    return "Linear session expired. Sign in again on the connect screen or in Settings → Connections.";
  }
  return formatLinearQuotaErrorMessage(message);
}

export function isLinearQuotaErrorMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("quota exceeded") ||
    lower.includes("rate limit") ||
    lower.includes("ratelimited") ||
    lower.includes("too many requests")
  );
}

export function isLinearUsageLimitErrorMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("usage limit") || lower.includes("usagelimitexceeded");
}

export function formatLinearQuotaErrorMessage(message: string): string {
  if (isLinearUsageLimitErrorMessage(message)) {
    return "Linear workspace usage limit reached. Upgrade your Linear plan or remove unused documents, then try again.";
  }
  if (isLinearQuotaErrorMessage(message)) {
    return "Linear rate limit reached. Wait a minute and try again.";
  }
  return message;
}
