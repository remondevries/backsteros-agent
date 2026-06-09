import { describe, expect, test } from "bun:test";
import { buildMorningReviewOverview } from "./morning-review-overview.ts";
import type { WhoopSnapshotEntity } from "./types.ts";

describe("buildMorningReviewOverview", () => {
  test("builds the default morning summary sections", () => {
    const whoop: WhoopSnapshotEntity = {
      id: "whoop-2026-06-08",
      date: "2026-06-08",
      recoveryScore: 82,
      recoveryState: "GREEN",
      sleepDuration: "7h 12m",
      sleepPerformance: 84,
    };

    const overview = buildMorningReviewOverview({
      weather: {
        locationLabel: "Leeuwarden, Netherlands",
        description: "partly cloudy",
        temperatureC: 14,
      },
      whoop,
      calendar: {
        events: [],
        firstTimedEvent: { title: "Team standup", timeLabel: "10:00 AM" },
      },
      linearIssues: [{ id: "BAC-1", title: "Fix bug" }],
    });

    expect(overview).toContain("Good morning");
    expect(overview).toContain("partly cloudy");
    expect(overview).toContain("7h 12m");
    expect(overview).toContain("cleared for a full training day");
    expect(overview).toContain("10:00 AM");
    expect(overview).toContain("Team standup");
    expect(overview).toContain("1 Linear issue due today");
  });
});
