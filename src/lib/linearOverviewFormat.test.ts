import { describe, expect, test } from "bun:test";
import { formatOverviewStartMonth, formatOverviewTargetDate } from "./linearOverviewFormat";

describe("linearOverviewFormat", () => {
  test("formats overview start month", () => {
    expect(formatOverviewStartMonth("2026-03-15")).toBe("Mar");
    expect(formatOverviewStartMonth(null)).toBe("—");
  });

  test("formats overview target date with ordinal", () => {
    expect(formatOverviewTargetDate("2026-02-27")).toBe("Feb 27th");
    expect(formatOverviewTargetDate("2026-02-01")).toBe("Feb 1st");
  });
});
