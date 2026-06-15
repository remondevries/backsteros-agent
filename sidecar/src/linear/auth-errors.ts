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
  return message;
}
