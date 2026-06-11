import { describe, expect, test } from "bun:test";
import { buildLookupTools, extractUrls, normalizeLookupSearchMode, resolveLookupSearchModeForRequest } from "./lookup-tools.ts";

describe("lookup tools", () => {
  test("normalizes search mode", () => {
    expect(normalizeLookupSearchMode("docs")).toBe("docs");
    expect(normalizeLookupSearchMode("web")).toBe("web");
    expect(normalizeLookupSearchMode(undefined)).toBe("web");
  });

  test("extracts urls from text", () => {
    expect(extractUrls("Read https://example.com/docs and https://ai.google.dev/gemini-api")).toEqual([
      "https://example.com/docs",
      "https://ai.google.dev/gemini-api",
    ]);
  });

  test("builds web and url tools together", () => {
    expect(buildLookupTools("web", "Check https://example.com")).toEqual([
      { google_search: {} },
      { url_context: {} },
    ]);
  });

  test("docs mode skips web search but keeps url context", () => {
    expect(buildLookupTools("docs", "Summarize https://example.com")).toEqual([
      { url_context: {} },
    ]);
    expect(buildLookupTools("docs", "Summarize this PDF")).toEqual([]);
  });

  test("auto-switches to docs for attachments without urls", () => {
    expect(
      resolveLookupSearchModeForRequest("web", "Summarize this PDF", true),
    ).toBe("docs");
    expect(
      resolveLookupSearchModeForRequest("web", "Read https://example.com", true),
    ).toBe("web");
    expect(
      resolveLookupSearchModeForRequest("docs", "Summarize this PDF", true),
    ).toBe("docs");
  });
});
