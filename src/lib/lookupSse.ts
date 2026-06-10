import type { AgentEvent } from "../chat/types";
import { getLookupAuthHeader, lookupEventsUrl } from "./lookupApi";

function isTerminalEvent(event: AgentEvent): boolean {
  return (
    event.type === "run.completed" ||
    event.type === "run.failed" ||
    event.type === "startup.failed"
  );
}

export async function subscribeToLookupRun(
  sessionId: string,
  runId: string,
  onEvent: (event: AgentEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(
    `${lookupEventsUrl(sessionId, runId)}&auth=${encodeURIComponent(getLookupAuthHeader().replace("Bearer ", ""))}`,
    {
      headers: {
        Authorization: getLookupAuthHeader(),
        Accept: "text/event-stream",
      },
      signal,
    },
  );

  if (!response.ok || !response.body) {
    throw new Error("Failed to connect to lookup event stream");
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
        const dataLine = chunk.split("\n").find((line) => line.startsWith("data:"));
        if (!dataLine) continue;
        const json = dataLine.slice(5).trim();
        if (!json) continue;

        const event = JSON.parse(json) as AgentEvent;
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
