import { describe, expect, it } from "bun:test";
import {
  buildGoodNightChatResponse,
  describeStrainTargetStatus,
  formatMovedIssuesPhrase,
  isProductiveDay,
} from "./good-night-response.ts";

describe("good-night-response", () => {
  it("builds an evening summary with strain token and completed issues", () => {
    const text = buildGoodNightChatResponse({
      firstName: "Remon",
      movedIssueCount: 2,
      completedIssueCount: 11,
      productivityScore: 9,
      whoop: {
        id: "whoop-2026-06-08",
        date: "2026-06-08",
        strainScore: 12.4,
        strainTarget: {
          value: 13.2,
          optimalLower: 10.5,
          optimalUpper: 14.8,
        },
      },
    });

    expect(text).toContain("Good evening Remon,");
    expect(text).toContain("productive day");
    expect(text).toContain("the same or better");
    expect(text).toContain("I moved 2 issues to tomorrow");
    expect(text).toContain("{{whoop-strain-score:12.4}}");
    expect(text).toContain("on target");
    expect(text).toContain("You completed 11 issues today which you see below.");
  });

  it("describes low productivity days and strain below target", () => {
    const text = buildGoodNightChatResponse({
      firstName: "Remon",
      movedIssueCount: 0,
      completedIssueCount: 2,
      productivityScore: 2,
      whoop: {
        id: "whoop-2026-06-08",
        date: "2026-06-08",
        strainScore: 8.1,
        strainTarget: {
          value: 13.2,
          optimalLower: 10.5,
          optimalUpper: 14.8,
        },
      },
    });

    expect(text).toContain("not so productive");
    expect(text).toContain("tomorrow will be better");
    expect(text).toContain("didn't need to move any issues");
    expect(text).toContain("2.4 below your target");
  });

  it("classifies strain target status", () => {
    expect(
      describeStrainTargetStatus(12, {
        value: 13,
        optimalLower: 10,
        optimalUpper: 14,
      }),
    ).toBe("on target");

    expect(
      describeStrainTargetStatus(16, {
        value: 13,
        optimalLower: 10,
        optimalUpper: 14,
      }),
    ).toBe("2 above your target");
  });

  it("treats productivity score 5 and above as productive", () => {
    expect(isProductiveDay(5)).toBe(true);
    expect(isProductiveDay(4)).toBe(false);
    expect(formatMovedIssuesPhrase(1)).toContain("1 issue");
  });
});
