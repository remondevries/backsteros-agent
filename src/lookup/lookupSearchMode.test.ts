import { describe, expect, test } from "bun:test";
import { lookupSearchModeLabel } from "./lookupSearchMode";

describe("lookupSearchMode", () => {
  test("labels web and docs modes", () => {
    expect(lookupSearchModeLabel("web")).toBe("Web");
    expect(lookupSearchModeLabel("docs")).toBe("Docs only");
  });
});
