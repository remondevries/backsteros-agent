import type { InputMode } from "../chat/TextVoiceToggle";

export type ComposerTtsControl = {
  enabled: boolean;
  onToggle: () => void;
  supported: boolean;
};

export type ComposerTextVoiceControl = {
  mode: InputMode;
  onChange: (mode: InputMode) => void;
  supported: boolean;
};

export type ComposerInputModeControls = {
  tts?: ComposerTtsControl;
  textVoice?: ComposerTextVoiceControl;
};
