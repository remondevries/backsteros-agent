import { describe, expect, test } from "bun:test";
import { createRunState, reconcileAssistantTextFromRun } from "./events.ts";

describe("reconcileAssistantTextFromRun", () => {
  test("returns null when streamed text already exists", () => {
    const state = createRunState("run-1");
    state.lastAssistantText = "Already streamed";

    expect(reconcileAssistantTextFromRun(state, { result: "Fallback" })).toBeNull();
    expect(state.lastAssistantText).toBe("Already streamed");
  });

  test("uses run result when stream produced no text", () => {
    const state = createRunState("run-2");

    expect(reconcileAssistantTextFromRun(state, { result: "  Yes, I can delete files.  " })).toBe(
      "Yes, I can delete files.",
    );
    expect(state.lastAssistantText).toBe("Yes, I can delete files.");
  });

  test("returns null when both stream and run result are empty", () => {
    const state = createRunState("run-3");

    expect(reconcileAssistantTextFromRun(state, { result: "   " })).toBeNull();
    expect(state.lastAssistantText).toBe("");
  });
});
