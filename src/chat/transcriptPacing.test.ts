import { describe, expect, test } from "bun:test";
import { TRANSCRIPT_MESSAGE_GAP_MS, transcriptGapWaitMs } from "./transcriptPacing";

describe("transcriptPacing", () => {
  test("does not delay the first assistant presentation", () => {
    expect(transcriptGapWaitMs(0, 10_000)).toBe(0);
  });

  test("waits the full gap immediately after a presentation completes", () => {
    expect(transcriptGapWaitMs(1000, 1000)).toBe(TRANSCRIPT_MESSAGE_GAP_MS);
  });

  test("waits only the remaining gap time", () => {
    expect(transcriptGapWaitMs(1000, 1000 + 200)).toBe(TRANSCRIPT_MESSAGE_GAP_MS - 200);
  });
});
