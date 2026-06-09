import { useSyncExternalStore } from "react";
import {
  getTtsPlaybackState,
  isRunPlaybackActive,
  playbackRunId,
  subscribeToTtsPlayback,
} from "../lib/tts";

export function useTtsPlayback(playbackId: string) {
  const state = useSyncExternalStore(
    subscribeToTtsPlayback,
    getTtsPlaybackState,
    getTtsPlaybackState,
  );

  const belongsToRun =
    state.playbackId != null &&
    (state.playbackId === playbackId ||
      playbackRunId(state.playbackId) === playbackId);
  const pinnedToRun =
    state.pinnedRunId != null &&
    (state.pinnedRunId === playbackId ||
      playbackRunId(state.pinnedRunId) === playbackId);
  const isPlaying = Boolean(playbackId && state.playing && !state.paused && belongsToRun);
  const isPaused = Boolean(playbackId && state.paused && pinnedToRun);
  const isPinned = pinnedToRun;

  return {
    isPlaying,
    isPaused,
    isPinned,
    progress: belongsToRun && (state.playing || state.paused) ? state.progress : 0,
  };
}

export function useRunPlaybackActive(runId: string): boolean {
  return useSyncExternalStore(
    subscribeToTtsPlayback,
    () => (runId ? isRunPlaybackActive(runId) : false),
    () => false,
  );
}

