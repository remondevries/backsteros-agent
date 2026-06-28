import { describe, expect, test } from "bun:test";
import { formatSdkRunErrorCode } from "./sdk-run-errors.ts";

describe("formatSdkRunErrorCode", () => {
  test("maps usage limit errors to actionable guidance", () => {
    expect(
      formatSdkRunErrorCode(
        "Increase limits for faster responses You're out of usage. Switch to Auto, or ask your admin to increase your limit to continue.",
      ),
    ).toContain("usage limit is exhausted");
  });

  test("maps stream content-type failures", () => {
    expect(formatSdkRunErrorCode("[unknown] unsupported content type text/event-stream")).toContain(
      "stream failed to connect",
    );
  });

  test("returns null for generic SDK errors", () => {
    expect(formatSdkRunErrorCode("Agent run error")).toBeNull();
  });
});
