/** Minimum pause between consecutive assistant presentations in the transcript. */
export const TRANSCRIPT_MESSAGE_GAP_MS = 500;

export function transcriptGapWaitMs(
  lastPresentationCompleteAt: number,
  now = Date.now(),
  gapMs = TRANSCRIPT_MESSAGE_GAP_MS,
): number {
  if (lastPresentationCompleteAt <= 0) return 0;
  return Math.max(0, gapMs - (now - lastPresentationCompleteAt));
}

export type TranscriptRevealTask = {
  id: string;
  reveal: () => void;
};
