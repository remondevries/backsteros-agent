import type { AgentEvent } from "./types";
import type { RunViewModel } from "./types";

type ApplyRunEvent = (run: RunViewModel, event: AgentEvent) => RunViewModel;

const BATCHABLE_RUN_EVENTS = new Set<AgentEvent["type"]>(["message.delta", "activity.step"]);

function scheduleFrame(callback: () => void): number {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    return window.requestAnimationFrame(callback);
  }
  return setTimeout(callback, 16) as unknown as number;
}

function cancelFrame(frameId: number): void {
  if (typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
    window.cancelAnimationFrame(frameId);
    return;
  }
  clearTimeout(frameId);
}

type SetRuns = (
  updater:
    | Record<string, RunViewModel>
    | ((current: Record<string, RunViewModel>) => Record<string, RunViewModel>),
) => void;

export function createRunEventBatcher({
  setRuns,
  createEmptyRun,
  applyEvent,
}: {
  setRuns: SetRuns;
  createEmptyRun: (runId: string) => RunViewModel;
  applyEvent: ApplyRunEvent;
}) {
  let pendingRunId: string | null = null;
  let pendingEvents: AgentEvent[] = [];
  let flushFrame: number | null = null;

  function applyEvents(runId: string, events: AgentEvent[]) {
    if (events.length === 0) return;
    setRuns((current) => {
      let run = current[runId] ?? createEmptyRun(runId);
      for (const event of events) {
        run = applyEvent(run, event);
      }
      return { ...current, [runId]: run };
    });
  }

  function flushPending() {
    if (flushFrame != null) {
      cancelFrame(flushFrame);
      flushFrame = null;
    }
    if (!pendingRunId || pendingEvents.length === 0) return;
    const runId = pendingRunId;
    const events = pendingEvents;
    pendingRunId = null;
    pendingEvents = [];
    applyEvents(runId, events);
  }

  function scheduleFlush() {
    if (flushFrame != null) return;
    flushFrame = scheduleFrame(() => {
      flushFrame = null;
      if (!pendingRunId || pendingEvents.length === 0) return;
      const runId = pendingRunId;
      const events = pendingEvents;
      pendingRunId = null;
      pendingEvents = [];
      applyEvents(runId, events);
    });
  }

  return {
    push(runId: string, event: AgentEvent) {
      if (BATCHABLE_RUN_EVENTS.has(event.type)) {
        if (pendingRunId && pendingRunId !== runId) {
          flushPending();
        }
        pendingRunId = runId;
        pendingEvents.push(event);
        scheduleFlush();
        return;
      }

      flushPending();
      applyEvents(runId, [event]);
    },
    flush() {
      flushPending();
    },
    dispose() {
      flushPending();
    },
  };
}
