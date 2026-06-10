import { describe, expect, test } from "bun:test";
import { buildInlineContentParts, contentHasInlineTokens } from "./inlineContentTokens";

describe("inlineContentTokens", () => {
  test("parses linear issue link token", () => {
    const text =
      "I have added Coffee to your grocery list of this week.\n{{linear-issue-link:view_grocery_list|https://linear.app/family/issue/FAM-118}}";
    expect(contentHasInlineTokens(text)).toBe(true);

    const parts = buildInlineContentParts(text);
    expect(parts).toEqual([
      {
        type: "text",
        value: "I have added Coffee to your grocery list of this week.\n",
      },
      {
        type: "linear-issue-link",
        label: "view grocery list",
        url: "https://linear.app/family/issue/FAM-118",
        raw: "{{linear-issue-link:view_grocery_list|https://linear.app/family/issue/FAM-118}}",
      },
    ]);
  });
});
