import { getSidecarConnection } from "./api";
import type { TtsVoice } from "./tts-types";
import { DEFAULT_VOICE_ID } from "./tts-types";

export const TTS_SAMPLE_TEXT = "Hello. I'll read assistant responses aloud.";

let activeAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;
let activePlaybackId: string | null = null;
let progressFrameId: number | null = null;
let warmupPromise: Promise<void> | null = null;
let activeSpeakGeneration = 0;
let activePlaybackStartedAt = 0;
let activePlaybackFallbackDurationSec = 0;

type PreparedAudio = {
  audio: HTMLAudioElement;
  objectUrl: string;
  playbackId: string;
};

let preparedNextAudio: PreparedAudio | null = null;

type PrefetchEntry = {
  text: string;
  voiceId: string;
  promise: Promise<Blob>;
};

const prefetchCache = new Map<string, PrefetchEntry>();
const prefetchControllers = new Map<string, AbortController>();
const MAX_STREAMING_PREFETCHES = 8;
const spokenOffsetByRun = new Map<string, number>();
const lastRawTextLenByRun = new Map<string, number>();
const streamEndedByRun = new Map<string, boolean>();
let speechChunkSeq = 0;
const STREAM_FLUSH_CHARS = 72;
const SYNTHESIS_MAX_CHARS = 220;
let speechQueue: Promise<void> = Promise.resolve();
let streamingRunId: string | null = null;
let streamingQueueDepth = 0;
let speechGeneration = 0;

export type TtsPlaybackState = {
  playbackId: string | null;
  pinnedRunId: string | null;
  progress: number;
  playing: boolean;
  paused: boolean;
};

let playbackState: TtsPlaybackState = {
  playbackId: null,
  pinnedRunId: null,
  progress: 0,
  playing: false,
  paused: false,
};

const playbackListeners = new Set<() => void>();

function emitPlaybackState(next: TtsPlaybackState): void {
  playbackState = next;
  for (const listener of playbackListeners) {
    listener();
  }
}

function resetPlaybackState(clearPin = true): void {
  if (activeAudio && !activeAudio.paused && !activeAudio.ended) {
    return;
  }
  activePlaybackId = null;
  emitPlaybackState({
    playbackId: null,
    pinnedRunId: clearPin ? null : playbackState.pinnedRunId,
    progress: clearPin ? 0 : playbackState.progress,
    playing: false,
    paused: false,
  });
}

export function subscribeToTtsPlayback(listener: () => void): () => void {
  playbackListeners.add(listener);
  return () => {
    playbackListeners.delete(listener);
  };
}

export function getTtsPlaybackState(): TtsPlaybackState {
  return playbackState;
}

export function playbackRunId(playbackId: string | null): string | null {
  if (!playbackId) return null;
  const colon = playbackId.indexOf(":");
  return colon === -1 ? playbackId : playbackId.slice(0, colon);
}

export function isRunPlaybackActive(runId: string): boolean {
  if (!runId) return false;

  const state = getTtsPlaybackState();
  if (state.paused && state.pinnedRunId === runId) {
    return true;
  }

  if (state.pinnedRunId === runId && state.playing && !state.paused) {
    return true;
  }

  if (activeAudio && activePlaybackId && !activeAudio.paused && !activeAudio.ended) {
    const activeRun = playbackRunId(activePlaybackId);
    if (activeRun === runId || activePlaybackId === runId) {
      return true;
    }
  }

  if (
    state.playing &&
    state.playbackId != null &&
    playbackRunId(state.playbackId) === runId
  ) {
    return true;
  }

  return streamingRunId === runId && streamingQueueDepth > 0;
}

export function isRunStreamPending(runId: string): boolean {
  if (!runId || streamingRunId !== runId) return false;
  if (streamingQueueDepth > 0) return true;
  return !streamEndedByRun.get(runId);
}

export function isRunAudioPlaying(runId: string): boolean {
  if (!runId) return false;

  const state = getTtsPlaybackState();
  if (state.pinnedRunId === runId && state.playing && !state.paused) {
    return true;
  }

  if (activeAudio && activePlaybackId && !activeAudio.paused && !activeAudio.ended) {
    const activeRun = playbackRunId(activePlaybackId);
    if (activeRun === runId || activePlaybackId === runId) {
      return true;
    }
  }

  return false;
}

export function isRunPlaybackPinned(runId: string): boolean {
  if (!runId) return false;
  return getTtsPlaybackState().pinnedRunId === runId;
}

export function pinPlaybackSession(runId: string): void {
  if (!runId) return;
  emitPlaybackState({ ...playbackState, pinnedRunId: runId });
}

function estimateWavDurationSec(blobBytes: number): number {
  const dataBytes = Math.max(0, blobBytes - 44);
  return dataBytes / (24000 * 2);
}

function computeAudioProgress(audio: HTMLAudioElement): number {
  const duration = audio.duration;
  if (Number.isFinite(duration) && duration > 0) {
    return Math.min(1, Math.max(0, audio.currentTime / duration));
  }
  if (activePlaybackFallbackDurationSec > 0 && activePlaybackStartedAt > 0) {
    const elapsedSec = (performance.now() - activePlaybackStartedAt) / 1000;
    return Math.min(1, Math.max(0, elapsedSec / activePlaybackFallbackDurationSec));
  }
  return 0;
}

export function getLivePlaybackProgress(runPlaybackId: string): number {
  if (!runPlaybackId) return 0;

  if (activeAudio && activePlaybackId) {
    const matchesRun =
      activePlaybackId === runPlaybackId ||
      playbackRunId(activePlaybackId) === runPlaybackId;
    if (matchesRun && !activeAudio.ended) {
      return computeAudioProgress(activeAudio);
    }
  }

  const state = getTtsPlaybackState();
  const belongsToRun =
    state.playbackId != null &&
    (state.playbackId === runPlaybackId ||
      playbackRunId(state.playbackId) === runPlaybackId);
  if (belongsToRun && (state.playing || state.paused)) {
    return Math.min(1, Math.max(0, state.progress));
  }

  if (isRunPlaybackActive(runPlaybackId)) {
    return 0.06;
  }

  if (isRunPlaybackPinned(runPlaybackId) && state.progress > 0) {
    return state.progress;
  }

  return 0;
}

function stopProgressLoop(): void {
  if (progressFrameId != null) {
    cancelAnimationFrame(progressFrameId);
    progressFrameId = null;
  }
}

function startProgressLoop(audio: HTMLAudioElement, playbackId: string): void {
  stopProgressLoop();

  const tick = () => {
    if (activeAudio !== audio || activePlaybackId !== playbackId) {
      stopProgressLoop();
      return;
    }

    const progress = computeAudioProgress(audio);
    const playing = !audio.paused && !audio.ended;
    emitPlaybackState({ ...playbackState, playbackId, progress, playing, paused: false });

    if (playing) {
      progressFrameId = requestAnimationFrame(tick);
    } else {
      stopProgressLoop();
    }
  };

  progressFrameId = requestAnimationFrame(tick);
}

function attachPlaybackListeners(audio: HTMLAudioElement, playbackId: string): void {
  const syncProgress = () => {
    if (activeAudio !== audio || activePlaybackId !== playbackId) return;
    const progress = computeAudioProgress(audio);
    emitPlaybackState({ ...playbackState, playbackId, progress, playing: true, paused: false });
  };

  audio.addEventListener("loadedmetadata", syncProgress);
  audio.addEventListener("durationchange", syncProgress);
  audio.addEventListener("playing", () => {
    syncProgress();
    startProgressLoop(audio, playbackId);
  });
  audio.addEventListener("ended", () => {
    stopProgressLoop();
    if (activePlaybackId !== playbackId) return;
    queueMicrotask(() => {
      if (activePlaybackId !== playbackId) return;
      if (streamingQueueDepth > 0) {
        emitPlaybackState({ ...playbackState, playbackId: null, progress: 0, playing: false, paused: false });
        return;
      }
      resetPlaybackState();
    });
  });
  audio.addEventListener("pause", () => {
    if (activeAudio !== audio || activePlaybackId !== playbackId || !audio.ended) {
      return;
    }
    stopProgressLoop();
    queueMicrotask(() => {
      if (activePlaybackId !== playbackId) return;
      if (streamingQueueDepth > 0) {
        emitPlaybackState({ ...playbackState, playbackId: null, progress: 0, playing: false, paused: false });
        return;
      }
      resetPlaybackState();
    });
  });
}

export function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

async function ttsRequest(path: string, init?: RequestInit, timeoutMs = 60_000): Promise<Response> {
  const { baseUrl, token } = getSidecarConnection();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();
  init?.signal?.addEventListener("abort", onExternalAbort);

  try {
    return await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
  } finally {
    window.clearTimeout(timeout);
    init?.signal?.removeEventListener("abort", onExternalAbort);
  }
}

export async function isSpeechSupported(): Promise<boolean> {
  try {
    const response = await ttsRequest("/tts/voices", undefined, 5_000);
    if (!response.ok) return false;
    const body = (await response.json()) as { voices?: TtsVoice[] };
    return (body.voices?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

async function synthesizeBlob(
  text: string,
  voiceId: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const response = await ttsRequest(
    "/tts/speak",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voiceId }),
      signal,
    },
    60_000,
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Speech synthesis failed");
  }

  const blob = await response.blob();
  return blob;
}

function clearActiveAudio(): void {
  stopProgressLoop();
  activePlaybackStartedAt = 0;
  activePlaybackFallbackDurationSec = 0;
  preparedNextAudio = null;
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }
  resetPlaybackState(false);
}

function waitForAudioReady(audio: HTMLAudioElement): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const done = () => {
      cleanup();
      resolve();
    };
    const fail = () => {
      cleanup();
      reject(new Error("Audio failed to load"));
    };
    const cleanup = () => {
      audio.removeEventListener("canplaythrough", done);
      audio.removeEventListener("loadeddata", done);
      audio.removeEventListener("error", fail);
    };

    audio.addEventListener("canplaythrough", done, { once: true });
    audio.addEventListener("loadeddata", done, { once: true });
    audio.addEventListener("error", fail, { once: true });
    audio.load();
  });
}

async function prepareAudioElement(blob: Blob, playbackId: string): Promise<PreparedAudio> {
  const objectUrl = URL.createObjectURL(blob);
  const audio = new Audio(objectUrl);
  audio.preload = "auto";
  await waitForAudioReady(audio);
  return { audio, objectUrl, playbackId };
}

function schedulePrepareNext(
  text: string,
  playbackId: string,
  voiceId: string,
): void {
  const cleaned = stripMarkdownForSpeech(text);
  if (!cleaned) return;

  prefetchSpeech(cleaned, { playbackId, voiceId });
  void resolveSpeechBlob(cleaned, voiceId, playbackId)
    .then((blob) => prepareAudioElement(blob, playbackId))
    .then((prepared) => {
      preparedNextAudio = prepared;
    })
    .catch(() => {});
}

async function playBlob(blob: Blob, playbackId: string | null): Promise<void> {
  const isStreamChunk = Boolean(streamingRunId && playbackId);

  let audio: HTMLAudioElement;
  let objectUrl: string;

  if (
    playbackId &&
    preparedNextAudio &&
    preparedNextAudio.playbackId === playbackId
  ) {
    ({ audio, objectUrl } = preparedNextAudio);
    preparedNextAudio = null;
  } else {
    ({ audio, objectUrl } = await prepareAudioElement(blob, playbackId ?? ""));
  }

  const previousUrl = isStreamChunk ? activeObjectUrl : null;
  const previousAudio = isStreamChunk ? activeAudio : null;

  if (!isStreamChunk) {
    clearActiveAudio();
  }

  activeObjectUrl = objectUrl;
  activeAudio = audio;
  activePlaybackStartedAt = performance.now();
  activePlaybackFallbackDurationSec = estimateWavDurationSec(blob.size);

  if (playbackId) {
    activePlaybackId = playbackId;
    attachPlaybackListeners(audio, playbackId);
    emitPlaybackState({
      ...playbackState,
      playbackId,
      pinnedRunId: playbackRunId(playbackId) ?? playbackId,
      progress: 0,
      playing: true,
      paused: false,
    });
  }

  await audio.play();

  if (isStreamChunk && previousUrl && previousUrl !== objectUrl) {
    URL.revokeObjectURL(previousUrl);
    previousAudio?.pause();
  }

  if (playbackId && !audio.paused && !audio.ended) {
    startProgressLoop(audio, playbackId);
  }

  await new Promise<void>((resolve) => {
    const finish = () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("pause", onPause);
      resolve();
    };
    const onEnded = () => finish();
    const onError = () => finish();
    const onPause = () => {
      if (streamingRunId && activeAudio === audio && !audio.ended) {
        return;
      }
      if (audio.ended || activeAudio !== audio) finish();
    };
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("pause", onPause);
  });
}

export function prefetchSpeech(
  text: string,
  options?: { voiceId?: string | null; playbackId?: string; priority?: boolean },
): void {
  const cleaned = stripMarkdownForSpeech(text);
  const playbackId = options?.playbackId;
  if (!cleaned || !playbackId) return;

  const voiceId = options?.voiceId ?? DEFAULT_VOICE_ID;
  const existing = prefetchCache.get(playbackId);
  if (existing?.text === cleaned && existing.voiceId === voiceId) {
    return;
  }

  if (options?.priority) {
    for (const [id, controller] of [...prefetchControllers.entries()]) {
      if (id !== playbackId) {
        controller.abort();
        prefetchControllers.delete(id);
        prefetchCache.delete(id);
      }
    }
  } else if (
    prefetchControllers.size >= MAX_STREAMING_PREFETCHES &&
    !prefetchControllers.has(playbackId)
  ) {
    return;
  }

  prefetchControllers.get(playbackId)?.abort();
  const controller = new AbortController();
  prefetchControllers.set(playbackId, controller);

  const promise = synthesizeBlob(cleaned, voiceId, controller.signal).catch((error) => {
    if (controller.signal.aborted) {
      throw error;
    }
    prefetchCache.delete(playbackId);
    throw error;
  });

  prefetchCache.set(playbackId, { text: cleaned, voiceId, promise });
}

export function clearSpeechPrefetch(playbackId?: string): void {
  if (playbackId) {
    prefetchControllers.get(playbackId)?.abort();
    prefetchControllers.delete(playbackId);
    prefetchCache.delete(playbackId);
    return;
  }

  for (const controller of prefetchControllers.values()) {
    controller.abort();
  }
  prefetchControllers.clear();
  prefetchCache.clear();
}

function splitForSynthesis(text: string, maxLen = SYNTHESIS_MAX_CHARS): string[] {
  if (!text) return [];
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let remainder = text;
  while (remainder.length > maxLen) {
    const slice = remainder.slice(0, maxLen);
    const lastSpace = slice.lastIndexOf(" ");
    const cut = lastSpace > 32 ? lastSpace : maxLen;
    chunks.push(remainder.slice(0, cut).trim());
    remainder = remainder.slice(cut).trimStart();
  }
  if (remainder) {
    chunks.push(remainder);
  }
  return chunks.filter(Boolean);
}

export function shouldFlushStreamingSpeechDelta(cleaned: string): boolean {
  if (cleaned.length >= STREAM_FLUSH_CHARS) return true;
  // Require punctuation after a word character so list ordinals like "1." do not flush early.
  return /[a-zA-Z][.!?][\s)"']*$/.test(cleaned);
}

function shouldFlushStreamingDelta(cleaned: string): boolean {
  return shouldFlushStreamingSpeechDelta(cleaned);
}

function enqueueSpeechChunks(
  runId: string,
  chunks: string[],
  clearFirst: boolean,
): void {
  let shouldClear = clearFirst;
  streamingQueueDepth += chunks.length;
  emitPlaybackState({ ...playbackState, pinnedRunId: runId });

  const voiceId = DEFAULT_VOICE_ID;

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index]!;
    const chunkId = `${runId}:${speechChunkSeq++}`;
    const nextChunk = chunks[index + 1];
    const resolvedNextId = nextChunk ? `${runId}:${speechChunkSeq}` : null;

    prefetchSpeech(chunk, { playbackId: chunkId });
    if (nextChunk && resolvedNextId) {
      prefetchSpeech(nextChunk, { playbackId: resolvedNextId });
    }

    if (!shouldClear && index === 0 && activeAudio && !activeAudio.ended) {
      schedulePrepareNext(chunk, chunkId, voiceId);
    }

    const clearActive = shouldClear;
    shouldClear = false;
    const generation = speechGeneration;
    const prepareNext =
      nextChunk && resolvedNextId
        ? { text: nextChunk, playbackId: resolvedNextId }
        : undefined;

    speechQueue = speechQueue
      .then(() => {
        if (generation !== speechGeneration) {
          streamingQueueDepth = Math.max(0, streamingQueueDepth - 1);
          if (streamingQueueDepth === 0) {
            streamingRunId = null;
            resetPlaybackState();
          } else {
            emitPlaybackState({ ...playbackState });
          }
          return;
        }
        return speak(chunk, {
          playbackId: chunkId,
          clearActive,
          prepareNext,
          voiceId,
        }).finally(() => {
          streamingQueueDepth = Math.max(0, streamingQueueDepth - 1);
          if (streamingQueueDepth === 0) {
            const streamEnded = streamEndedByRun.get(runId) ?? false;
            if (!streamEnded) {
              emitPlaybackState({
                ...playbackState,
                pinnedRunId: runId,
                playing: false,
                paused: false,
              });
            } else {
              streamingRunId = null;
              resetPlaybackState();
              streamEndedByRun.delete(runId);
            }
          } else if (streamingRunId) {
            emitPlaybackState({
              ...playbackState,
              pinnedRunId: streamingRunId,
              playing: true,
              paused: false,
            });
          }
        });
      })
      .catch(() => {});
  }
}

export function resetStreamingSpeech(runId?: string): void {
  speechGeneration += 1;
  speechQueue = Promise.resolve();
  streamingRunId = null;
  streamingQueueDepth = 0;
  if (runId) {
    spokenOffsetByRun.delete(runId);
    lastRawTextLenByRun.delete(runId);
    streamEndedByRun.delete(runId);
    return;
  }
  spokenOffsetByRun.clear();
  lastRawTextLenByRun.clear();
  streamEndedByRun.clear();
}

export function advanceStreamingSpeech(
  runId: string,
  text: string,
  finished: boolean,
): void {
  const rawOffset = spokenOffsetByRun.get(runId) ?? 0;
  if (text.length < rawOffset) {
    spokenOffsetByRun.delete(runId);
  }

  const effectiveOffset = spokenOffsetByRun.get(runId) ?? 0;
  const rawDelta = text.slice(effectiveOffset);
  const cleaned = stripMarkdownForSpeech(rawDelta);

  if (!cleaned && finished) {
    spokenOffsetByRun.set(runId, text.length);
    return;
  }

  if (!cleaned) return;

  const shouldSpeak = finished || shouldFlushStreamingDelta(cleaned);
  if (!shouldSpeak) return;

  if (finished) {
    streamEndedByRun.set(runId, true);
    emitPlaybackState({ ...playbackState, pinnedRunId: runId });
  }

  if (streamingRunId !== runId) {
    speechGeneration += 1;
    speechQueue = Promise.resolve();
    streamingRunId = runId;
  }

  const chunks = splitForSynthesis(cleaned);
  if (chunks.length === 0) {
    if (finished) spokenOffsetByRun.set(runId, text.length);
    return;
  }

  spokenOffsetByRun.set(runId, text.length);
  lastRawTextLenByRun.set(runId, text.length);

  enqueueSpeechChunks(runId, chunks, effectiveOffset === 0);
}

async function resolveSpeechBlob(
  cleaned: string,
  voiceId: string,
  playbackId: string | null,
): Promise<Blob> {
  if (playbackId) {
    const cached = prefetchCache.get(playbackId);
    if (cached?.text === cleaned && cached.voiceId === voiceId) {
      return cached.promise;
    }
  }

  const promise = synthesizeBlob(cleaned, voiceId);
  if (playbackId) {
    prefetchCache.set(playbackId, { text: cleaned, voiceId, promise });
  }
  return promise;
}

export async function speak(
  text: string,
  options?: {
    voiceId?: string | null;
    playbackId?: string;
    clearActive?: boolean;
    prepareNext?: { text: string; playbackId: string };
  },
): Promise<void> {
  const cleaned = stripMarkdownForSpeech(text);
  if (!cleaned) return;

  const generation = ++activeSpeakGeneration;

  if (options?.clearActive !== false) {
    clearActiveAudio();
  }

  const voiceId = options?.voiceId ?? DEFAULT_VOICE_ID;
  const playbackId = options?.playbackId ?? null;

  if (playbackId) {
    prefetchSpeech(cleaned, { playbackId, voiceId, priority: true });
  }

  if (playbackId) {
    emitPlaybackState({
      ...playbackState,
      playbackId,
      pinnedRunId: playbackRunId(playbackId) ?? playbackId,
      progress: 0,
      playing: true,
      paused: false,
    });
  }

  if (warmupPromise) {
    await warmupPromise.catch(() => {});
  }

  const blob = await resolveSpeechBlob(cleaned, voiceId, playbackId);
  if (generation !== activeSpeakGeneration) {
    return;
  }

  if (options?.prepareNext) {
    schedulePrepareNext(
      options.prepareNext.text,
      options.prepareNext.playbackId,
      voiceId,
    );
  }

  await playBlob(blob, playbackId);
  if (generation !== activeSpeakGeneration) {
    return;
  }
}

export function isTtsPlaying(): boolean {
  if (activeAudio && !activeAudio.paused && !activeAudio.ended) {
    return true;
  }
  return playbackState.playing && !playbackState.paused;
}

export function pauseSpeaking(): void {
  if (activeAudio && activePlaybackId && !activeAudio.paused && !activeAudio.ended) {
    const playbackId = activePlaybackId;
    activeAudio.pause();
    stopProgressLoop();
    const progress = computeAudioProgress(activeAudio);
    emitPlaybackState({
      ...playbackState,
      playbackId,
      progress,
      playing: false,
      paused: true,
    });
    return;
  }

  if (playbackState.playing && !playbackState.paused && streamingRunId) {
    return;
  }

  if (playbackState.playing && !playbackState.paused) {
    activeSpeakGeneration += 1;
    void stopSpeaking();
  }
}

export async function resumeSpeaking(): Promise<void> {
  if (!activeAudio || activeAudio.ended || !activePlaybackId) return;
  if (!activeAudio.paused) return;

  const playbackId = activePlaybackId;
  try {
    await activeAudio.play();
  } catch {
    return;
  }

  const progress = computeAudioProgress(activeAudio);
  emitPlaybackState({
    ...playbackState,
    playbackId,
    progress,
    playing: true,
    paused: false,
  });
  startProgressLoop(activeAudio, playbackId);
}

export async function stopSpeaking(): Promise<void> {
  resetStreamingSpeech();
  clearActiveAudio();
}

export async function primeSpeech(voiceId?: string | null): Promise<void> {
  if (warmupPromise) {
    return warmupPromise;
  }

  warmupPromise = (async () => {
    const response = await ttsRequest(
      "/tts/warmup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId: voiceId ?? DEFAULT_VOICE_ID }),
      },
      30_000,
    );

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "TTS warmup failed");
    }
  })();

  try {
    await warmupPromise;
  } finally {
    warmupPromise = null;
  }
}
