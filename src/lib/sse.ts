import type { AgentEvent } from "../chat/types";
import { eventsUrl, getAuthHeader } from "./api";

function isTerminalEvent(event: AgentEvent): boolean {
  return (
    event.type === "run.completed" ||
    event.type === "run.failed" ||
    event.type === "startup.failed"
  );
}

export function subscribeToRun(
  sessionId: string,
  runId: string,
  onEvent: (event: AgentEvent) => void,
): () => void {
  const source = new EventSource(eventsUrl(sessionId, runId), {
    withCredentials: false,
  });

  void getAuthHeader();

  const handler = (message: MessageEvent<string>) => {
    try {
      const event = JSON.parse(message.data) as AgentEvent;
      onEvent(event);
      if (isTerminalEvent(event)) {
        source.close();
      }
    } catch {
      // ignore malformed events
    }
  };

  const eventTypes = [
    "message.delta",
    "run.started",
    "run.completed",
    "run.failed",
    "startup.failed",
    "activity.started",
    "activity.step",
    "activity.completed",
    "tool.started",
    "tool.updated",
    "tool.completed",
    "context.added",
    "entities.created",
    "entities.updated",
    "approval.requested",
    "approval.resolved",
    "suggestions.added",
  ];

  for (const type of eventTypes) {
    source.addEventListener(type, handler as EventListener);
  }

  source.onerror = () => {
    source.close();
  };

  return () => source.close();
}

export async function subscribeToRunWithAuth(
  sessionId: string,
  runId: string,
  onEvent: (event: AgentEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const authHeader = getAuthHeader();
  const response = await fetch(
    `${eventsUrl(sessionId, runId)}&auth=${encodeURIComponent(authHeader.replace("Bearer ", ""))}`,
    {
      credentials: "include",
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
        Accept: "text/event-stream",
      },
      signal,
    },
  );

  if (!response.ok || !response.body) {
    throw new Error("Failed to connect to event stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        const dataLine = chunk
          .split("\n")
          .find((line) => line.startsWith("data:"));
        if (!dataLine) continue;
        const json = dataLine.slice(5).trim();
        if (!json) continue;

        const event = JSON.parse(json) as AgentEvent;
        // #region agent log
        fetch("http://127.0.0.1:7933/ingest/280fb855-6de7-45c0-90bf-5ee8faee78a1", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "180d80" },
          body: JSON.stringify({
            sessionId: "180d80",
            runId,
            hypothesisId: "G,H",
            location: "sse.ts:subscribeToRunWithAuth:event",
            message: "SSE event parsed",
            data: {
              eventType: event.type,
              textLen: event.type === "message.delta" ? event.text.length : undefined,
              runStatus: event.type === "run.completed" ? event.status : undefined,
              failedMessage:
                event.type === "run.failed" || event.type === "startup.failed"
                  ? "message" in event
                    ? event.message.slice(0, 120)
                    : undefined
                  : undefined,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        onEvent(event);

        if (isTerminalEvent(event)) {
          return;
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}
