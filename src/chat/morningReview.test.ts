import { describe, expect, test } from "bun:test";
import {
  GOOD_MORNING_FEEL_PROMPT,
  GOOD_MORNING_WAKE_PROMPT,
  hasGoodMorningFeelPromptForRun,
  hasGoodMorningWakePromptForRun,
} from "./morningReview";

describe("hasGoodMorningWakePromptForRun", () => {
  test("matches the wake prompt for a specific good morning run", () => {
    expect(
      hasGoodMorningWakePromptForRun(
        [
          {
            role: "assistant",
            flowVariant: "good-morning",
            text: GOOD_MORNING_WAKE_PROMPT,
            flowRunId: "run-a",
          },
        ],
        "run-a",
      ),
    ).toBe(true);

    expect(
      hasGoodMorningWakePromptForRun(
        [
          {
            role: "assistant",
            flowVariant: "good-morning",
            text: GOOD_MORNING_WAKE_PROMPT,
            flowRunId: "run-a",
          },
        ],
        "run-b",
      ),
    ).toBe(false);
  });
});

describe("hasGoodMorningFeelPromptForRun", () => {
  test("matches the feel prompt for a specific good morning run", () => {
    expect(
      hasGoodMorningFeelPromptForRun(
        [
          {
            role: "assistant",
            flowVariant: "good-morning",
            text: GOOD_MORNING_FEEL_PROMPT,
            flowRunId: "run-a",
          },
        ],
        "run-a",
      ),
    ).toBe(true);

    expect(
      hasGoodMorningFeelPromptForRun(
        [
          {
            role: "assistant",
            flowVariant: "good-morning",
            text: GOOD_MORNING_FEEL_PROMPT,
            flowRunId: "run-a",
          },
        ],
        "run-b",
      ),
    ).toBe(false);
  });
});
