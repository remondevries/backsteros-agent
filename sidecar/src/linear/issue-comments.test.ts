import { describe, expect, test } from "bun:test";
import {
  LINEAR_AGENT_THREAD_PREFIX,
  buildLinearAgentThreadBody,
} from "./issue-comments.ts";

describe("buildLinearAgentThreadBody", () => {
  test("returns @linear when no user body is provided", () => {
    expect(buildLinearAgentThreadBody()).toBe(LINEAR_AGENT_THREAD_PREFIX);
    expect(buildLinearAgentThreadBody("   ")).toBe(LINEAR_AGENT_THREAD_PREFIX);
  });

  test("prefixes user text when @linear is missing", () => {
    expect(buildLinearAgentThreadBody("Can you summarize this issue?")).toBe(
      "@linear Can you summarize this issue?",
    );
  });

  test("preserves user text that already mentions @linear", () => {
    expect(buildLinearAgentThreadBody("@linear please review")).toBe("@linear please review");
  });
});
