import { describe, expect, test } from "bun:test";
import {
  buildShasMatch,
  describeDesktopReleaseMismatch,
  formatBuildShaLabel,
} from "./releaseSync";

describe("releaseSync", () => {
  test("matches identical and prefix SHAs", () => {
    const full = "6a3dd8be47709e2de5d85938f8cc331aeb96f6fd";
    expect(buildShasMatch(full, full)).toBe(true);
    expect(buildShasMatch(full, "6a3dd8b")).toBe(true);
  });

  test("reports mismatch for different SHAs", () => {
    const message = describeDesktopReleaseMismatch("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    expect(message).toContain("Desktop UI (aaaaaaa) is behind the server (bbbbbbb)");
    expect(message).toContain("npm run tauri:build");
  });

  test("ignores unknown SHAs", () => {
    expect(buildShasMatch("unknown", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")).toBe(true);
    expect(describeDesktopReleaseMismatch("unknown", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")).toBeNull();
  });

  test("formats short labels", () => {
    expect(formatBuildShaLabel("6a3dd8be47709e2de5d85938f8cc331aeb96f6fd")).toBe("6a3dd8b");
  });
});
