// #region agent log
export function debugSessionLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
): void {
  fetch("http://127.0.0.1:7520/ingest/4580ffec-ea73-4c04-a5e5-8313ab77c6f6", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "720910",
    },
    body: JSON.stringify({
      sessionId: "720910",
      location,
      message,
      data,
      hypothesisId,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}
// #endregion
