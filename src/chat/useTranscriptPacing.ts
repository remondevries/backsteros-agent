import { useCallback, useEffect, useRef } from "react";
import {
  TRANSCRIPT_MESSAGE_GAP_MS,
  type TranscriptRevealTask,
  transcriptGapWaitMs,
} from "./transcriptPacing";

export function useTranscriptPacing() {
  const queueRef = useRef<TranscriptRevealTask[]>([]);
  const gapTimerRef = useRef<number | null>(null);
  const presentationActiveRef = useRef(false);
  const lastPresentationCompleteAtRef = useRef(0);

  const clearGapTimer = useCallback(() => {
    if (gapTimerRef.current != null) {
      window.clearTimeout(gapTimerRef.current);
      gapTimerRef.current = null;
    }
  }, []);

  const drainQueue = useCallback(() => {
    if (presentationActiveRef.current) return;
    if (gapTimerRef.current != null) return;
    if (queueRef.current.length === 0) return;

    const waitMs = transcriptGapWaitMs(lastPresentationCompleteAtRef.current);
    gapTimerRef.current = window.setTimeout(() => {
      gapTimerRef.current = null;
      if (presentationActiveRef.current) {
        gapTimerRef.current = window.setTimeout(() => {
          gapTimerRef.current = null;
          drainQueue();
        }, 50);
        return;
      }
      const task = queueRef.current.shift();
      if (!task) return;
      presentationActiveRef.current = true;
      task.reveal();
    }, waitMs);
  }, []);

  const markPresentationActive = useCallback(() => {
    presentationActiveRef.current = true;
    clearGapTimer();
  }, [clearGapTimer]);

  const markPresentationComplete = useCallback(() => {
    presentationActiveRef.current = false;
    lastPresentationCompleteAtRef.current = Date.now();
    drainQueue();
  }, [drainQueue]);

  const enqueueReveal = useCallback(
    (reveal: () => void, id: string = crypto.randomUUID()) => {
      queueRef.current.push({ id, reveal });
      drainQueue();
    },
    [drainQueue],
  );

  const clearPendingReveals = useCallback(() => {
    clearGapTimer();
    queueRef.current = [];
  }, [clearGapTimer]);

  const resetPacing = useCallback(() => {
    clearPendingReveals();
    presentationActiveRef.current = false;
    lastPresentationCompleteAtRef.current = 0;
  }, [clearPendingReveals]);

  useEffect(() => () => clearGapTimer(), [clearGapTimer]);

  return {
    enqueueReveal,
    markPresentationActive,
    markPresentationComplete,
    clearPendingReveals,
    resetPacing,
    gapMs: TRANSCRIPT_MESSAGE_GAP_MS,
  };
}
