import { useCallback, useEffect, useState } from "react";
import {
  advanceStreamingSpeech,
  isSpeechSupported,
  primeSpeech,
  resetStreamingSpeech,
  speak as speakRaw,
  stopSpeaking,
} from "../lib/tts";

const STORAGE_KEY = "backster-tts-enabled";
const listeners = new Set<() => void>();

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // Ignore storage failures in restricted environments.
  }
  for (const listener of listeners) {
    listener();
  }
}

export function useTts() {
  const [enabled, setEnabledState] = useState(readEnabled);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const sync = () => setEnabledState(readEnabled());
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const available = await isSpeechSupported();
      setSupported(available);
      if (available) {
        void primeSpeech();
      }
    })();
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    writeEnabled(value);
    setEnabledState(value);
    if (value) {
      void primeSpeech();
    } else {
      void stopSpeaking();
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled(!readEnabled());
  }, [setEnabled]);

  const speak = useCallback((text: string, playbackId?: string) => {
    if (readEnabled() && text.trim()) {
      resetStreamingSpeech();
      void speakRaw(text, { playbackId });
    }
  }, []);

  const advance = useCallback((runId: string, text: string, finished: boolean) => {
    if (readEnabled() && text.trim()) {
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
    speak,
    advance,
    stop,
    supported,
  };
}
