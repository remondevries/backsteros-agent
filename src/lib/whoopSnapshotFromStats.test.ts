import { describe, expect, test } from "bun:test";
import { whoopSnapshotFromStats } from "./whoopSnapshotFromStats";

describe("whoopSnapshotFromStats", () => {
  test("builds a snapshot entity from vault note stats", () => {
    expect(
      whoopSnapshotFromStats("2026-06-12", {
        sleep: 84,
        recovery: 71,
        strain: 4.3,
      }),
    ).toEqual({
      id: "whoop-2026-06-12",
      date: "2026-06-12",
      sleepPerformance: 84,
      recoveryScore: 71,
      strainScore: 4.3,
    });
  });

  test("returns null when all metrics are missing", () => {
    expect(
      whoopSnapshotFromStats("2026-06-12", {
        sleep: null,
        recovery: null,
        strain: null,
      }),
    ).toBeNull();
  });
});
