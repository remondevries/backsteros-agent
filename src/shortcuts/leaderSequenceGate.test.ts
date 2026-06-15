import { describe, expect, test } from "bun:test";
import { isLeaderSequencePending, registerLeaderKeyPress } from "./leaderSequenceGate";

describe("leaderSequenceGate", () => {
  test("is pending immediately after g is pressed", () => {
    registerLeaderKeyPress();
    expect(isLeaderSequencePending()).toBe(true);
  });

  test("is not pending after the sequence timeout", () => {
    registerLeaderKeyPress();
    const originalNow = Date.now;
    Date.now = () => originalNow() + 801;
    try {
      expect(isLeaderSequencePending()).toBe(false);
    } finally {
      Date.now = originalNow;
    }
  });
});
