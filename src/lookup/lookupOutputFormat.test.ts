import { describe, expect, test } from "bun:test";
import { lookupOutputFormatLabel } from "./lookupOutputFormat";

describe("lookupOutputFormat", () => {
  test("labels output formats", () => {
    expect(lookupOutputFormatLabel("default")).toBe("Default");
    expect(lookupOutputFormatLabel("action-items")).toBe("Action items");
    expect(lookupOutputFormatLabel("outline")).toBe("Outline");
  });
});
