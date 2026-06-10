import { describe, expect, test } from "bun:test";
import { lookupDepthLabel, lookupDepthModelName } from "./lookupDepth";

describe("lookupDepth", () => {
  test("labels fast and deep modes", () => {
    expect(lookupDepthLabel("fast")).toBe("Fast");
    expect(lookupDepthLabel("deep")).toBe("Deep");
    expect(lookupDepthModelName("fast")).toBe("Gemini 2.5 Flash");
    expect(lookupDepthModelName("deep")).toBe("Gemini 2.5 Flash · reasoning");
  });
});
