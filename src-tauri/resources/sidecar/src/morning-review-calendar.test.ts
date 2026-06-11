import { describe, expect, test } from "bun:test";
import { formatRFC3339InTimezone, formatTimezoneOffset } from "./daily-note.ts";
import { resolveCalendarDayBounds } from "./morning-review-calendar.ts";

describe("morning-review-calendar", () => {
  test("resolveCalendarDayBounds uses RFC3339 timestamps with timezone offsets", () => {
    const bounds = resolveCalendarDayBounds("Europe/Amsterdam", new Date("2026-06-08T10:00:00Z"));

    expect(bounds.date).toBe("2026-06-08");
    expect(bounds.timeMin).toMatch(/^2026-06-08T00:00:00[+-]\d{2}:\d{2}$/);
    expect(bounds.timeMax).toMatch(/^2026-06-08T23:59:59[+-]\d{2}:\d{2}$/);
  });

  test("formatTimezoneOffset returns UTC offset for UTC", () => {
    expect(formatTimezoneOffset("UTC", new Date("2026-06-08T12:00:00Z"))).toBe("+00:00");
  });

  test("formatRFC3339InTimezone builds offset timestamps", () => {
    expect(
      formatRFC3339InTimezone(
        "2026-06-08",
        "00:00:00",
        "UTC",
        new Date("2026-06-08T00:00:00.000Z"),
      ),
    ).toBe("2026-06-08T00:00:00+00:00");
  });
});
