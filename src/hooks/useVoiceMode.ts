import { useCallback, useEffect, useRef, useState } from "react";
import { isMicrophoneSupported } from "../lib/mic";
import {
  createPushToTalkRecorder,
  type PushToTalkRecorder,
} from "../lib/pushToTalk";
import { isSttSupported, primeStt, transcribePcm } from "../lib/stt";
import {
  advanceStreamingSpeech,
  isSpeechSupported,
  isTtsPlaying,
  primeSpeech,
  resetStreamingSpeech,
  speak as speakRaw,
  stopSpeaking,
} from "../lib/tts";

const VOICE_MODE_STORAGE_KEY = "backster-voice-mode-enabled";
const TTS_STORAGE_KEY = "backster-tts-enabled";
const PTT_KEY = " ";
const MIN_TRANSCRIPT_LENGTH = 6;
const MIN_PTT_SAMPLES = 4_800;
const PTT_ENERGY_THRESHOLD = 0.006;

function hasSpeechEnergy(audio: Float32Array, threshold = PTT_ENERGY_THRESHOLD): boolean {
  if (audio.length === 0) return false;
  let sumSquares = 0;
  for (const sample of audio) {
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / audio.length) > threshold;
}

function isPlausibleUserTranscript(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < MIN_TRANSCRIPT_LENGTH) return false;
  const words = trimmed.split(/\s+/).filter((word) => /[a-zA-Z]{2,}/.test(word));
  return words.length >= 1;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(target.closest(".session-tab-rename-input, .attachment-modal-backdrop"));
}

function isSpaceKey(event: KeyboardEvent): boolean {
  return event.code === "Space" || event.key === " " || event.key === "Spacebar";
}

const storageListeners = new Set<() => void>();

function readVoiceModeEnabled(): boolean {
  try {
    return localStorage.getItem(VOICE_MODE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeVoiceModeEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(VOICE_MODE_STORAGE_KEY, String(enabled));
    localStorage.setItem(TTS_STORAGE_KEY, String(enabled));
  } catch {
    // Ignore storage failures in restricted environments.
  }
  for (const listener of storageListeners) {
    listener();
  }
}

function readTtsEnabled(): boolean {
  try {
    return localStorage.getItem(TTS_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function useVoiceMode({
  onTranscript,
  isActive = true,
}: {
  onTranscript: (text: string) => void | Promise<void>;
  isActive?: boolean;
}) {
  const [enabled, setEnabledState] = useState(readVoiceModeEnabled);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);

  const pttRecorderRef = useRef<PushToTalkRecorder | null>(null);
  const pttActiveRef = useRef(false);
  const sttAbortRef = useRef<AbortController | null>(null);
  const enabledRef = useRef(enabled);
  const onTranscriptRef = useRef(onTranscript);

  enabledRef.current = enabled;
  onTranscriptRef.current = onTranscript;

  useEffect(() => {
    const sync = () => setEnabledState(readVoiceModeEnabled());
    storageListeners.add(sync);
    return () => {
      storageListeners.delete(sync);
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const [ttsAvailable, sttAvailable, micAvailable] = await Promise.all([
        isSpeechSupported(),
        isSttSupported(),
        Promise.resolve(isMicrophoneSupported()),
      ]);
      setSupported(ttsAvailable && sttAvailable && micAvailable);
    })();
  }, []);

  const processPttAudio = useCallback(async (audio: Float32Array) => {
    if (!enabledRef.current) return;

    if (audio.length < MIN_PTT_SAMPLES || !hasSpeechEnergy(audio)) {
      return;
    }

    sttAbortRef.current?.abort();
    const sttAbort = new AbortController();
    sttAbortRef.current = sttAbort;

    setTranscribing(true);
    setError(null);

    let text: string;
    try {
      text = await transcribePcm(audio, sttAbort.signal);
    } catch (caught) {
      if (!sttAbort.signal.aborted) {
        setError(caught instanceof Error ? caught.message : "Speech transcription failed");
      }
      if (sttAbortRef.current === sttAbort) sttAbortRef.current = null;
      if (!sttAbort.signal.aborted) setTranscribing(false);
      return;
    }

    if (sttAbortRef.current === sttAbort) sttAbortRef.current = null;
    if (sttAbort.signal.aborted) return;

    // Transcription (STT) is done here; the agent run that follows is tracked separately,
    // so "Processing…" reflects only the speech-to-text step, not the whole response.
    setTranscribing(false);
    setLastTranscript(text || null);

    if (!isPlausibleUserTranscript(text)) return;
    if (text.length >= MIN_TRANSCRIPT_LENGTH) {
      await onTranscriptRef.current(text);
    }
  }, []);

  const cancelPushToTalk = useCallback(() => {
    if (!pttActiveRef.current) return;

    const recorder = pttRecorderRef.current;
    pttActiveRef.current = false;
    setSpeaking(false);
    recorder?.stopRecording();
  }, []);

  const interrupt = useCallback(() => {
    sttAbortRef.current?.abort();
    sttAbortRef.current = null;
    cancelPushToTalk();
    setTranscribing(false);
    void stopSpeaking();
  }, [cancelPushToTalk]);

  const stopVoiceCapture = useCallback(async () => {
    interrupt();
    setListening(false);

    if (pttRecorderRef.current) {
      pttRecorderRef.current.destroy();
      pttRecorderRef.current = null;
    }
  }, [interrupt]);

  const beginPushToTalk = useCallback(() => {
    const recorder = pttRecorderRef.current;
    if (!enabledRef.current || pttActiveRef.current || !recorder) return;

    pttActiveRef.current = true;
    setSpeaking(true);

    if (isTtsPlaying()) {
      void stopSpeaking();
    }

    recorder.startRecording();
  }, []);

  const endPushToTalk = useCallback(() => {
    const recorder = pttRecorderRef.current;
    if (!pttActiveRef.current || !recorder) return;

    pttActiveRef.current = false;
    setSpeaking(false);

    const audio = recorder.stopRecording();
    void processPttAudio(audio);
  }, [processPttAudio]);

  const startVoiceCapture = useCallback(async () => {
    setError(null);

    const [, recorder] = await Promise.all([
      Promise.all([primeSpeech(), primeStt()]),
      createPushToTalkRecorder(),
    ]);

    pttRecorderRef.current = recorder;
    await recorder.prime();
    setListening(true);
  }, []);

  useEffect(() => {
    if (!enabled || !supported || !isActive) {
      void stopVoiceCapture();
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        await startVoiceCapture();
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Failed to start voice mode");
          writeVoiceModeEnabled(false);
          setEnabledState(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      void stopVoiceCapture();
    };
  }, [enabled, supported, isActive, startVoiceCapture, stopVoiceCapture]);

  useEffect(() => {
    if (!enabled || !supported || !isActive) return;

    function onKeyDown(event: KeyboardEvent) {
      if (!isSpaceKey(event)) return;
      if (event.repeat || pttActiveRef.current) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (isEditableTarget(event.target)) {
        event.preventDefault();
        if (event.target instanceof HTMLElement) {
          event.target.blur();
        }
      }

      event.preventDefault();
      event.stopPropagation();
      beginPushToTalk();
    }

    function onKeyUp(event: KeyboardEvent) {
      if (!isSpaceKey(event) || !pttActiveRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      endPushToTalk();
    }

    function onWindowBlur() {
      if (pttActiveRef.current) {
        endPushToTalk();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onWindowBlur);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [beginPushToTalk, enabled, endPushToTalk, isActive, supported]);

  const setEnabled = useCallback(
    (value: boolean) => {
      writeVoiceModeEnabled(value);
      setEnabledState(value);
      if (!value) {
        void stopVoiceCapture();
      }
    },
    [stopVoiceCapture],
  );

  const toggle = useCallback(() => {
    setEnabled(!readVoiceModeEnabled());
  }, [setEnabled]);

  const speak = useCallback((text: string, playbackId?: string) => {
    if ((readVoiceModeEnabled() || readTtsEnabled()) && text.trim()) {
      resetStreamingSpeech();
      void speakRaw(text, { playbackId });
    }
  }, []);

  const advance = useCallback((runId: string, text: string, finished: boolean) => {
    if ((readVoiceModeEnabled() || readTtsEnabled()) && text.trim()) {
      advanceStreamingSpeech(runId, text, finished);
    }
  }, []);

  const stop = useCallback(() => {
    void stopSpeaking();
  }, []);

  return {
    enabled,
    setEnabled,
    toggle,
    supported,
    listening,
    transcribing,
    speaking,
    error,
    lastTranscript,
    speak,
    advance,
    stop,
    interrupt,
    pushToTalkKey: PTT_KEY,
  };
}
