import { describe, expect, it } from "bun:test";
import {
  buildGoodMorningChatResponse,
  filterUrgentLinearIssues,
  isBusyDay,
} from "./good-morning-response.ts";

describe("buildGoodMorningChatResponse", () => {
  it("builds a conversational summary with sleep, recovery, and workload", () => {
    const text = buildGoodMorningChatResponse({
      firstName: "Remon",
      linearIssues: [{ id: "1", title: "A", priority: 2 }, { id: "2", title: "B" }],
      whoop: {
        id: "w1",
        date: "2026-06-09",
        sleepPerformance: 84,
        recoveryScore: 72,
      },
    });

    expect(text).toContain("Good morning Remon,");
    expect(text).toContain("not so busy day");
    expect(text).toContain("{{linear-issues-count:2}} issues due today");
    expect(text).toContain("{{whoop-sleep-score:84}}");
    expect(text).toContain("good rest");
    expect(text).not.toContain("sleep score of 84");
    expect(text).toContain("{{whoop-recovery-score:72}}");
    expect(text).not.toContain("recovery of 72");
    expect(text).not.toContain("that's pretty good");
    expect(text).not.toContain("that's okay");
  });

  it("marks busy days when there are many issues", () => {
    const text = buildGoodMorningChatResponse({
      firstName: "Remon",
      linearIssues: Array.from({ length: 5 }, (_, index) => ({
        id: String(index),
        title: `Issue ${index}`,
      })),
      whoop: null,
    });

    expect(text).toContain("busy day");
  });
});

describe("filterUrgentLinearIssues", () => {
  it("returns only urgent priority issues", () => {
    const urgent = filterUrgentLinearIssues([
      { id: "1", title: "Urgent", priority: 1 },
      { id: "2", title: "Normal", priority: 3 },
    ]);

    expect(urgent).toHaveLength(1);
    expect(urgent[0]?.title).toBe("Urgent");
  });
});

describe("isBusyDay", () => {
  it("treats more than three issues as busy", () => {
    expect(isBusyDay(4)).toBe(true);
    expect(isBusyDay(3)).toBe(false);
  });
});
