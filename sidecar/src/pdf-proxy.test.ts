import { describe, expect, test } from "bun:test";
import { fetchRemotePdf, isLinearPrivateFileUrl } from "./pdf-proxy.ts";

describe("fetchRemotePdf", () => {
  test("rejects non-http urls", async () => {
    await expect(fetchRemotePdf("file:///tmp/test.pdf")).rejects.toThrow("Invalid URL");
    await expect(fetchRemotePdf("not-a-url")).rejects.toThrow("Invalid URL");
  });
});

describe("isLinearPrivateFileUrl", () => {
  test("detects uploads.linear.app hostnames", () => {
    expect(
      isLinearPrivateFileUrl(
        "https://uploads.linear.app/6db02bb9-fba2-473b-8f9d-f38188e84813/d20adbea-186d-4643-ad07-004bda7d099d",
      ),
    ).toBe(true);
    expect(isLinearPrivateFileUrl("https://example.com/file.pdf")).toBe(false);
  });
});
