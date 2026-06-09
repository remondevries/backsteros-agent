import { describe, expect, test } from "bun:test";
import { resolveMorningReviewDueDate, resolveTomorrowDueDate } from "./morning-review-linear.ts";

describe("good night linear helpers", () => {
  test("resolves tomorrow in timezone", () => {
    expect(resolveMorningReviewDueDate("UTC", new Date("2026-06-08T12:00:00Z"))).toBe("2026-06-08");
    expect(resolveTomorrowDueDate("UTC", new Date("2026-06-08T12:00:00Z"))).toBe("2026-06-09");
  });
});
