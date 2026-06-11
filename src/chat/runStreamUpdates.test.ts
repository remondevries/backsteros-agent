import { describe, expect, test } from "bun:test";
import { createRunEventBatcher } from "./runStreamUpdates";
import type { AgentEvent } from "./types";
import type { RunViewModel } from "./types";

function createEmptyRun(runId: string): RunViewModel {
  return {
    runId,
    status: "running",
    text: "",
    steps: [],
    entities: [],
    approvals: [],
    expanded: true,
    startedAt: Date.now(),
  };
}

function applyEvent(run: RunViewModel, event: AgentEvent): RunViewModel {
  if (event.type === "message.delta") {
    return { ...run, text: run.text + event.text };
  }
  if (event.type === "run.completed") {
    return { ...run, status: event.status, finishedAt: Date.now(), expanded: false };
  }
  return run;
}

describe("createRunEventBatcher", () => {
  test("applies terminal events immediately", () => {
    let runs: Record<string, RunViewModel> = {};
    const batcher = createRunEventBatcher({
      setRuns: (updater) => {
        runs = typeof updater === "function" ? updater(runs) : updater;
      },
      createEmptyRun,
      applyEvent,
    });

    batcher.push("run-1", { type: "message.delta", text: "Hi" });
    batcher.flush();
    expect(runs["run-1"]?.text).toBe("Hi");

    batcher.push("run-1", {
      type: "run.completed",
      runId: "run-1",
      status: "finished",
      durationMs: 10,
    });
    expect(runs["run-1"]?.status).toBe("finished");
  });
});
