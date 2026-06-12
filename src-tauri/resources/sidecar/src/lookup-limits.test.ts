import { describe, expect, test } from "bun:test";
import {
  MAX_LOOKUP_ASSISTANT_HISTORY_CHARS,
  MAX_LOOKUP_ATTACHMENT_CHARS,
  prepareLookupAssistantHistoryText,
  prepareLookupAttachmentContent,
  stripLookupCitationBlocks,
} from "./lookup-limits.ts";

describe("lookup limits", () => {
  test("strips citation blocks from assistant text", () => {
    const text = "Summary here.\n\n**Sources**\n- [Example](https://example.com)";
    expect(stripLookupCitationBlocks(text)).toBe("Summary here.");
  });

  test("strips linked page blocks from assistant text", () => {
    const text = "Summary here.\n\n**Linked pages**\n- https://example.com";
    expect(stripLookupCitationBlocks(text)).toBe("Summary here.");
  });

  test("truncates long attachment content", () => {
    const content = "x".repeat(MAX_LOOKUP_ATTACHMENT_CHARS + 100);
    const result = prepareLookupAttachmentContent(content);
    expect(result.length).toBeLessThan(content.length);
    expect(result).toContain("attachment truncated");
  });

  test("prepareLookupAssistantHistoryText strips citations then truncates", () => {
    const body = "y".repeat(MAX_LOOKUP_ASSISTANT_HISTORY_CHARS + 50);
    const text = `${body}\n\n**Sources**\n- https://example.com`;
    const result = prepareLookupAssistantHistoryText(text);
    expect(result).not.toContain("**Sources**");
    expect(result).toContain("prior reply truncated");
    expect(result.length).toBeLessThan(text.length);
  });
});
