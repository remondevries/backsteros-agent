import { describe, expect, test } from "bun:test";
import {
  GOOD_MORNING_FEEL_PROMPT,
  hasGoodMorningFeelPromptForRun,
} from "./morningReview";

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
