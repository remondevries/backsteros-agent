import { describe, expect, test } from "bun:test";
import { shouldFlushStreamingSpeechDelta } from "./tts.ts";

describe("shouldFlushStreamingSpeechDelta", () => {
  test("flushes complete sentences ending after a word character", () => {
    expect(shouldFlushStreamingSpeechDelta("Hello.")).toBe(true);
    expect(shouldFlushStreamingSpeechDelta("Really?")).toBe(true);
    expect(shouldFlushStreamingSpeechDelta('Sounds good!"')).toBe(true);
  });

  test("does not flush numbered list ordinals alone", () => {
    expect(shouldFlushStreamingSpeechDelta("1.")).toBe(false);
    expect(shouldFlushStreamingSpeechDelta("12.")).toBe(false);
  });

  test("flushes long buffers without waiting for punctuation", () => {
    const long = "a".repeat(72);
    expect(shouldFlushStreamingSpeechDelta(long)).toBe(true);
  });
});
