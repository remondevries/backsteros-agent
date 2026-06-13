import { getAuthHeader, getSidecarConnection } from "./api";
import {
  isLinearWatcherChangeEvent,
  linearWatcherChangeToNotification,
  type LinearWatcherPollEvent,
  type LinearWatcherStreamEvent,
} from "./notificationPayloads";
import { pushNotification } from "./notifications";

const streamListeners = new Set<(event: LinearWatcherStreamEvent) => void>();

export function addLinearWatcherStreamListener(
  listener: (event: LinearWatcherStreamEvent) => void,
): () => void {
  streamListeners.add(listener);
  return () => streamListeners.delete(listener);
}

function dispatchLinearWatcherStreamEvent(event: LinearWatcherStreamEvent): void {
  for (const listener of streamListeners) {
    listener(event);
  }
}

export function isLinearWatcherPollEvent(
  event: LinearWatcherStreamEvent,
): event is LinearWatcherPollEvent {
  return event.type === "linear.watcher.poll";
}

export function linearWatcherEventsUrl(): string {
  const { baseUrl } = getSidecarConnection();
  const token = getAuthHeader().replace("Bearer ", "");
  return `${baseUrl}/linear/watchers/events?auth=${encodeURIComponent(token)}`;
}

export function handleLinearWatcherStreamEvent(event: LinearWatcherStreamEvent): boolean {
  if (!isLinearWatcherChangeEvent(event)) {
    return false;
  }

  const notification = linearWatcherChangeToNotification(event);
  pushNotification(notification);
  return true;
}

export function subscribeToLinearWatcherEvents(options?: {
  onEvent?: (event: LinearWatcherStreamEvent) => void;
  onError?: (error: unknown) => void;
}): () => void {
  const controller = new AbortController();
  let reconnectTimer: number | null = null;
  let closed = false;

  const connect = async () => {
    if (closed) return;

    try {
      const response = await fetch(linearWatcherEventsUrl(), {
        headers: {
          Authorization: getAuthHeader(),
          Accept: "text/event-stream",
        },
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Watcher stream failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!closed) {
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

          const event = JSON.parse(json) as LinearWatcherStreamEvent;
          dispatchLinearWatcherStreamEvent(event);
          options?.onEvent?.(event);
          handleLinearWatcherStreamEvent(event);
        }
      }
    } catch (error) {
      if (controller.signal.aborted || closed) {
        return;
      }
      options?.onError?.(error);
      reconnectTimer = window.setTimeout(() => {
        void connect();
      }, 5000);
    }
  };

  void connect();

  return () => {
    closed = true;
    controller.abort();
    if (reconnectTimer != null) {
      window.clearTimeout(reconnectTimer);
    }
  };
}
