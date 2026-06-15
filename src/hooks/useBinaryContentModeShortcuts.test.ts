import { describe, expect, test } from "bun:test";
import { cycleBinaryContentMode } from "./useBinaryContentModeShortcuts";

describe("cycleBinaryContentMode", () => {
  const modes = ["issues", "documents"] as const;

  test("cycles forward and backward through two modes", () => {
    expect(cycleBinaryContentMode("issues", modes, "next")).toBe("documents");
    expect(cycleBinaryContentMode("documents", modes, "next")).toBe("issues");
    expect(cycleBinaryContentMode("issues", modes, "previous")).toBe("documents");
    expect(cycleBinaryContentMode("documents", modes, "previous")).toBe("issues");
  });
});
