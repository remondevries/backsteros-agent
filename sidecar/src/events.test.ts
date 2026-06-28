import { describe, expect, test } from "bun:test";
import {
  createRunState,
  mapSdkMessageToEvents,
  reconcileAssistantTextFromRun,
  resolveAgentRunFailureMessage,
} from "./events.ts";

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

describe("resolveAgentRunFailureMessage", () => {
  test("prefers SDK status error detail", () => {
    const state = createRunState("run-4");
    state.lastStatusMessage = "MCP server linear failed to connect";

    expect(
      resolveAgentRunFailureMessage(state, {
        linearMcpAttached: true,
      }),
    ).toBe("MCP server linear failed to connect");
  });

  test("ignores generic SDK status errors in favor of contextual messaging", () => {
    const state = createRunState("run-7");
    state.lastStatusMessage = "Agent run error";

    expect(
      resolveAgentRunFailureMessage(state, {
        panelAgent: "linear",
        focusKind: "linear_document",
        cursorApiKeyConfigured: true,
      }),
    ).toContain("Linear assistant");
  });

  test("prefers persisted SDK error code over generic status text", () => {
    const state = createRunState("run-8");
    state.lastStatusMessage = "Agent run error";

    expect(
      resolveAgentRunFailureMessage(state, {
        sdkErrorCode:
          "Increase limits for faster responses You're out of usage. Switch to Auto, or ask your admin to increase your limit to continue.",
      }),
    ).toContain("usage limit is exhausted");
  });

  test("uses linear panel messaging without blaming cursor generically", () => {
    const state = createRunState("run-6");

    expect(
      resolveAgentRunFailureMessage(state, {
        panelAgent: "linear",
        focusKind: "linear_document",
        cursorApiKeyConfigured: false,
      }),
    ).toContain("Linear assistant");
    expect(
      resolveAgentRunFailureMessage(state, {
        panelAgent: "linear",
        focusKind: "linear_document",
        cursorApiKeyConfigured: true,
      }),
    ).toContain("Linear assistant");
    expect(
      resolveAgentRunFailureMessage(state, {
        panelAgent: "linear",
      }),
    ).toContain("Linear assistant");
  });
});

describe("mapSdkMessageToEvents", () => {
  test("captures SDK status ERROR messages", async () => {
    const state = createRunState("run-5");
    const events = await mapSdkMessageToEvents(
      {
        type: "status",
        agent_id: "agent-1",
        run_id: "run-5",
        status: "ERROR",
        message: "Run failed in cloud",
      },
      state,
    );

    expect(state.lastStatusMessage).toBe("Run failed in cloud");
    expect(events).toEqual([
      expect.objectContaining({
        type: "activity.step",
        status: "error",
        label: "Run failed in cloud",
      }),
    ]);
  });
});
