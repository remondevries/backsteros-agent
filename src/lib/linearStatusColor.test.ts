import { describe, expect, test } from "vitest";
import {
  adaptLinearStatusOklch,
  formatLinearStatusOklch,
  parseLinearStatusColor,
  resolveLinearStatusColor,
} from "./linearStatusColor";

describe("linearStatusColor", () => {
  test("parses hex and formats oklch css", () => {
    const parsed = parseLinearStatusColor("#fabd00");
    expect(parsed).not.toBeNull();
    expect(formatLinearStatusOklch(parsed!)).toBe("oklch(0.831 0.170 85.0)");
  });

  test("parses oklch css strings", () => {
    expect(parseLinearStatusColor("oklch(0.5 0.1 120)")).toEqual({
      l: 0.5,
      c: 0.1,
      h: 120,
    });
  });

  test("lifts neutral grays in dark mode", () => {
    const gray = parseLinearStatusColor("#e2e2e2")!;
    expect(adaptLinearStatusOklch(gray, "dark").l).toBeGreaterThan(0.9);
  });

  test("softens light neutrals in light mode", () => {
    const gray = parseLinearStatusColor("#e2e2e2")!;
    expect(adaptLinearStatusOklch(gray, "light").l).toBeLessThan(gray.l);
  });

  test("resolveLinearStatusColor returns oklch css", () => {
    expect(resolveLinearStatusColor("started", "#fabd00", { colorScheme: "light" })).toMatch(
      /^oklch\(/,
    );
  });
});
