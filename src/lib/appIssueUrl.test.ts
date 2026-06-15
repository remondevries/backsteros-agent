import { describe, expect, test } from "vitest";
import { issueProjectSlug, slugifyAppUrlSegment } from "./appIssueUrl";

describe("appIssueUrl", () => {
  test("slugifies project names for URL segments", () => {
    expect(slugifyAppUrlSegment("Backster OS")).toBe("backster-os");
    expect(issueProjectSlug("Backster OS")).toBe("backster-os");
  });

  test("uses inbox slug when project is missing", () => {
    expect(issueProjectSlug(null)).toBe("inbox");
    expect(issueProjectSlug("")).toBe("inbox");
  });
});
