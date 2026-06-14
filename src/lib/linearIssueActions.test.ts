import { describe, expect, test } from "bun:test";
import { buildLinearIssueCursorLink } from "./linearIssueActions";

describe("buildLinearIssueCursorLink", () => {
  test("uses branch checkout link when branch is available", () => {
    expect(
      buildLinearIssueCursorLink({
        url: "https://linear.app/acme/issue/BOS-1",
        branchName: "feature/bos-1",
      }),
    ).toBe("cursor://vscode.git/checkout?ref=feature%2Fbos-1");
  });

  test("falls back to issue url when branch is missing", () => {
    expect(
      buildLinearIssueCursorLink({
        url: "https://linear.app/acme/issue/BOS-1",
        branchName: null,
      }),
    ).toBe("https://linear.app/acme/issue/BOS-1");
  });
});
