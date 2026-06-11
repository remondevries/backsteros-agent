import { describe, expect, test } from "bun:test";
import {
  formatWorldTimeLine,
  lookupWorldTimes,
  resolveTimezoneQuery,
} from "./world-time.ts";

describe("resolveTimezoneQuery", () => {
  test("resolves IANA timezone ids directly", () => {
    expect(resolveTimezoneQuery("Europe/Amsterdam")).toBe("Europe/Amsterdam");
    expect(resolveTimezoneQuery("America/New_York")).toBe("America/New_York");
  });

  test("resolves common city aliases", () => {
    expect(resolveTimezoneQuery("Tokyo")).toBe("Asia/Tokyo");
    expect(resolveTimezoneQuery("new york")).toBe("America/New_York");
    expect(resolveTimezoneQuery("NYC")).toBe("America/New_York");
    expect(resolveTimezoneQuery("San Francisco")).toBe("America/Los_Angeles");
  });

  test("resolves local aliases to the user timezone", () => {
    expect(resolveTimezoneQuery("home", { userTimezone: "Europe/Amsterdam" })).toBe(
      "Europe/Amsterdam",
    );
  });
});

describe("lookupWorldTimes", () => {
  test("formats multiple locations in one response", () => {
    const result = lookupWorldTimes(["Tokyo", "London"], {
      userTimezone: "UTC",
      now: new Date("2026-06-10T12:00:00Z"),
    });

    expect(result).toContain("Tokyo (Asia/Tokyo)");
    expect(result).toContain("London (Europe/London)");
  });

  test("defaults to the user timezone when no locations are passed", () => {
    const result = lookupWorldTimes([], {
      userTimezone: "Europe/Amsterdam",
      now: new Date("2026-06-10T12:00:00Z"),
    });

    expect(result).toContain("Local time (Europe/Amsterdam)");
  });

  test("reports unknown locations without failing the whole lookup", () => {
    const result = lookupWorldTimes(["Tokyo", "Atlantis"], {
      userTimezone: "UTC",
      now: new Date("2026-06-10T12:00:00Z"),
    });

    expect(result).toContain("Tokyo (Asia/Tokyo)");
    expect(result).toContain("Unknown locations: Atlantis");
  });
});

describe("formatWorldTimeLine", () => {
  test("includes date, time, and offset", () => {
    const line = formatWorldTimeLine(
      "Tokyo",
      "Asia/Tokyo",
      new Date("2026-06-10T12:00:00Z"),
    );

    expect(line).toMatch(/Tokyo \(Asia\/Tokyo\)/);
    expect(line).toMatch(/\d{2}:\d{2}/);
    expect(line).toMatch(/GMT\+9|UTC\+9/i);
  });
});
