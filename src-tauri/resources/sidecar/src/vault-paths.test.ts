import { describe, expect, test } from "bun:test";
import {
  isExcludedVaultPath,
  isObsidianConfigVaultPath,
  shouldSkipVaultDirectory,
} from "./vault-paths.ts";

describe("vault-paths", () => {
  test("treats .obsidian as excluded", () => {
    expect(isObsidianConfigVaultPath(".obsidian")).toBe(true);
    expect(isObsidianConfigVaultPath(".obsidian/plugins/backster-os/node_modules/foo.js")).toBe(true);
    expect(isExcludedVaultPath(".obsidian/app.json")).toBe(true);
  });

  test("allows normal note paths", () => {
    expect(isExcludedVaultPath("Inbox/test.md")).toBe(false);
    expect(isExcludedVaultPath("Daily/2025-06-10.md")).toBe(false);
  });

  test("skips .obsidian and archive directories during walks", () => {
    expect(shouldSkipVaultDirectory(".obsidian")).toBe(true);
    expect(shouldSkipVaultDirectory("archive")).toBe(true);
    expect(shouldSkipVaultDirectory("Inbox")).toBe(false);
  });
});
