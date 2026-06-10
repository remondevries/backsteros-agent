import { describe, expect, test } from "bun:test";
import {
  createFlowAssistantMessage,
  shouldScheduleFlowFollowUp,
} from "./followUp";

describe("automation followUp", () => {
  test("creates assistant follow-up messages with flow metadata", () => {
    const message = createFlowAssistantMessage({
      text: "How do you feel?",
      flowVariant: "good-morning",
      flowRunId: "run-1",
    });

    expect(message.role).toBe("assistant");
    expect(message.flowVariant).toBe("good-morning");
    expect(message.flowRunId).toBe("run-1");
    expect(message.text).toBe("How do you feel?");
  });

  test("dedupes follow-up scheduling by prompt and pacing key", () => {
    const enqueuedKeys = new Set<string>();
    const messages = [
      {
        role: "assistant" as const,
        flowVariant: "good-morning" as const,
        text: "How do you feel? How was your sleep?",
        flowRunId: "run-1",
      },
    ];

    expect(
      shouldScheduleFlowFollowUp({
        messages,
        runId: "run-1",
        pacingKey: "good-morning-feel-run-1",
        enqueuedKeys,
        hasPromptForRun: () => true,
      }),
    ).toBe(false);

    expect(
      shouldScheduleFlowFollowUp({
        messages: [],
        runId: "run-1",
        pacingKey: "good-morning-feel-run-1",
        enqueuedKeys,
        hasPromptForRun: () => false,
      }),
    ).toBe(true);

    enqueuedKeys.add("good-morning-feel-run-1");

    expect(
      shouldScheduleFlowFollowUp({
        messages: [],
        runId: "run-1",
        pacingKey: "good-morning-feel-run-1",
        enqueuedKeys,
        hasPromptForRun: () => false,
      }),
    ).toBe(false);
  });
});
