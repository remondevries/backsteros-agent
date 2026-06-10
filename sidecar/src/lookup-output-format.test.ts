import { describe, expect, test } from "bun:test";
import {
  appendOutputFormatInstruction,
  buildLookupOutputInstruction,
  normalizeLookupOutputFormat,
} from "./lookup-output-format.ts";

describe("lookup output format", () => {
  test("normalizes output format", () => {
    expect(normalizeLookupOutputFormat("bullets")).toBe("bullets");
    expect(normalizeLookupOutputFormat("action-items")).toBe("action-items");
    expect(normalizeLookupOutputFormat("unknown")).toBe("default");
  });

  test("adds formatting instructions", () => {
    expect(buildLookupOutputInstruction("action-items")).toContain("checkbox");
    expect(appendOutputFormatInstruction("Base", "outline")).toContain("Base");
    expect(appendOutputFormatInstruction("Base", "outline")).toContain("outline");
    expect(appendOutputFormatInstruction("Base", "default")).toBe("Base");
  });
});
