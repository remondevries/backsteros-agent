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

  test("parses vault note link token", () => {
    const text =
      "Okay, I added it to your letters.\n{{vault-note-link:view_letter_note|Letters/2026-03-08 - Belastingdienst.md}}";
    expect(contentHasInlineTokens(text)).toBe(true);

    const parts = buildInlineContentParts(text);
    expect(parts).toEqual([
      {
        type: "text",
        value: "Okay, I added it to your letters.\n",
      },
      {
        type: "vault-note-link",
        label: "view letter note",
        path: "Letters/2026-03-08 - Belastingdienst.md",
        raw: "{{vault-note-link:view_letter_note|Letters/2026-03-08 - Belastingdienst.md}}",
      },
    ]);
  });
});
