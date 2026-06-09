import { describe, expect, test } from "bun:test";
import { formatNowContext } from "./now.ts";

describe("formatNowContext", () => {
  test("formats date and weekday in the given timezone", () => {
    const context = formatNowContext(
      "Europe/Amsterdam",
      new Date("2026-06-08T10:00:00Z"),
    );
    expect(context).toContain("[Now]");
    expect(context).toContain("2026-06-08");
    expect(context).toContain("Europe/Amsterdam");
  });
});
