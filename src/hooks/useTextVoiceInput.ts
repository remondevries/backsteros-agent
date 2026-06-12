import { useCallback, useMemo, type MutableRefObject } from "react";
import type { InputMode } from "../chat/TextVoiceToggle";
import type { ComposerInputModeControls } from "../chat/composerInputMode";
import { useInputModeShortcuts } from "./useInputModeShortcuts";
import { useTts } from "./useTts";
import { useVoiceMode } from "./useVoiceMode";

export function useTextVoiceInput({
  isActive,
  onTranscript,
  focusComposer,
  focusGuardRef,
  fallbackTtsActive,
}: {
  isActive: boolean;
  onTranscript: (text: string) => Promise<void>;
  focusComposer?: () => void;
  focusGuardRef?: MutableRefObject<boolean>;
  fallbackTtsActive?: boolean;
}) {
  const voiceMode = useVoiceMode({
    onTranscript,
    isActive,
  });
  const voiceModeSupported = voiceMode.supported;
  const fallbackTts = useTts({
    isActive: fallbackTtsActive ?? (isActive && !voiceModeSupported),
  });

  const voiceModeEnabled = voiceModeSupported ? voiceMode.enabled : false;

  if (focusGuardRef) {
    focusGuardRef.current = voiceModeEnabled;
  }

  const ttsSupported = voiceModeSupported || fallbackTts.supported;
  const ttsEnabled = voiceModeSupported ? voiceMode.enabled : fallbackTts.enabled;
  const toggleVoiceModeRaw = voiceModeSupported ? voiceMode.toggle : fallbackTts.toggle;

  const refocusComposer = useCallback(() => {
    focusComposer?.();
  }, [focusComposer]);

  const toggleVoiceMode = useCallback(() => {
    const wasEnabled = voiceModeEnabled;
    toggleVoiceModeRaw();
    if (wasEnabled) {
      refocusComposer();
    }
  }, [refocusComposer, toggleVoiceModeRaw, voiceModeEnabled]);

  const setVoiceModeEnabled = useCallback(
    (enabled: boolean) => {
      if (!voiceModeSupported) return;
      voiceMode.setEnabled(enabled);
      if (!enabled) {
        refocusComposer();
      }
    },
    [refocusComposer, voiceMode, voiceModeSupported],
  );

  useInputModeShortcuts({
    isActive,
    supported: voiceModeSupported,
    setEnabled: setVoiceModeEnabled,
    onSwitchToText: refocusComposer,
  });

  const advanceStreamingTts = voiceModeSupported ? voiceMode.advance : fallbackTts.advance;
  const stopSpeaking = voiceModeSupported ? voiceMode.stop : fallbackTts.stop;
  const interruptVoice = voiceModeSupported ? voiceMode.interrupt : fallbackTts.stop;

  const handleTextVoiceChange = useCallback(
    (mode: InputMode) => {
      if ((mode === "voice") !== voiceModeEnabled) {
        toggleVoiceMode();
      }
    },
    [toggleVoiceMode, voiceModeEnabled],
  );

  const inputModeControls = useMemo((): ComposerInputModeControls => {
    const controls: ComposerInputModeControls = {};

    if (ttsSupported && !voiceModeSupported) {
      controls.tts = {
        enabled: ttsEnabled,
        onToggle: toggleVoiceMode,
        supported: true,
      };
    }

    if (voiceModeSupported) {
      controls.textVoice = {
        mode: voiceModeEnabled ? "voice" : "text",
        onChange: handleTextVoiceChange,
        supported: true,
      };
    }

    return controls;
  }, [
    handleTextVoiceChange,
    toggleVoiceMode,
    ttsEnabled,
    ttsSupported,
    voiceModeEnabled,
    voiceModeSupported,
  ]);

  const voiceTurnPhase = useMemo(() => {
    if (!voiceModeEnabled) return null;
    if (voiceMode.speaking) return "listening" as const;
    if (voiceMode.transcribing) return "processing" as const;
    return null;
  }, [voiceMode.speaking, voiceMode.transcribing, voiceModeEnabled]);

  return {
    voiceModeEnabled,
    voiceModeSupported,
    ttsSupported,
    ttsEnabled,
    voiceTurnPhase,
    voiceModeError: voiceMode.error,
    advanceStreamingTts,
    stopSpeaking,
    interruptVoice,
    inputModeControls,
    setVoiceModeEnabled,
    toggleVoiceMode,
  };
}
