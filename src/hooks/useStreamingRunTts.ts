import { useEffect, useRef } from "react";
import type { RunViewModel } from "../chat/types";
import { prefetchSpeech } from "../lib/tts";

export function useStreamingRunTts({
  runs,
  isActive,
  ttsEnabled,
  ttsSupported,
  advanceStreamingTts,
  latestFinishedRunId,
}: {
  runs: Record<string, RunViewModel>;
  isActive: boolean;
  ttsEnabled: boolean;
  ttsSupported: boolean;
  advanceStreamingTts: (runId: string, text: string, finished: boolean) => void;
  latestFinishedRunId: string | null;
}) {
  const prevRunStatusRef = useRef<Record<string, RunViewModel["status"]>>({});
  const ttsSessionReadyRef = useRef(false);
  const prefetchedRunIdsRef = useRef(new Set<string>());

  const resetTtsRunTracking = () => {
    prevRunStatusRef.current = {};
    ttsSessionReadyRef.current = false;
    prefetchedRunIdsRef.current.clear();
  };

  useEffect(() => {
    if (!ttsSupported || !latestFinishedRunId) return;
    if (prefetchedRunIdsRef.current.has(latestFinishedRunId)) return;

    const run = runs[latestFinishedRunId];
    if (!run?.text.trim()) return;

    prefetchedRunIdsRef.current.add(latestFinishedRunId);
    prefetchSpeech(run.text, { playbackId: latestFinishedRunId });
  }, [ttsSupported, latestFinishedRunId, runs]);

  useEffect(() => {
    if (!isActive) return;

    if (!ttsSessionReadyRef.current) {
      for (const [runId, run] of Object.entries(runs)) {
        prevRunStatusRef.current[runId] = run.status;
      }
      ttsSessionReadyRef.current = true;
      return;
    }

    if (!ttsEnabled) return;

    for (const [runId, run] of Object.entries(runs)) {
      const previousStatus = prevRunStatusRef.current[runId];

      if (run.text.trim()) {
        if (run.status === "running") {
          advanceStreamingTts(runId, run.text, false);
        } else if (run.status === "finished" && previousStatus === "running") {
          advanceStreamingTts(runId, run.text, true);
          if (ttsSupported) {
            prefetchedRunIdsRef.current.add(runId);
            prefetchSpeech(run.text, { playbackId: runId, priority: true });
          }
        } else if (
          (run.status === "error" || run.status === "cancelled") &&
          previousStatus === "running"
        ) {
          advanceStreamingTts(runId, run.text, true);
        }
      }

      prevRunStatusRef.current[runId] = run.status;
    }
  }, [runs, ttsEnabled, ttsSupported, advanceStreamingTts, isActive]);

  return { resetTtsRunTracking };
}
