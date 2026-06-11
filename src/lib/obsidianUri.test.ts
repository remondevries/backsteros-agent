import { describe, expect, test } from "bun:test";
import {
  buildObsidianUri,
  normalizeObsidianFilePath,
  parseObsidianUrl,
} from "./obsidianUri";

describe("normalizeObsidianFilePath", () => {
  test("strips .md extension and normalizes slashes", () => {
    expect(normalizeObsidianFilePath("Letters\\2026-06-11 - All Beauty.md")).toBe(
      "Letters/2026-06-11 - All Beauty",
    );
  });
});

describe("buildObsidianUri", () => {
  test("encodes spaces with %20 and omits .md extension", () => {
    expect(buildObsidianUri("Vault", "Letters/2026-06-11 - All Beauty.md")).toBe(
      "obsidian://open?vault=Vault&file=Letters%2F2026-06-11%20-%20All%20Beauty",
    );
  });

  test("round-trips through parseObsidianUrl", () => {
    const href = buildObsidianUri("Vault", "Letters/2026-06-11 - All Beauty.md");
    expect(parseObsidianUrl(href)).toEqual({
      vault: "Vault",
      file: "Letters/2026-06-11 - All Beauty",
    });
  });
});
