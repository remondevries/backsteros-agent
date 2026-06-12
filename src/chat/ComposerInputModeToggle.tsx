import { TextVoiceToggle } from "./TextVoiceToggle";
import { TtsToggle } from "./TtsToggle";
import type { ComposerInputModeControls } from "./composerInputMode";

export function ComposerInputModeToggle({
  controls,
  disabled,
}: {
  controls: ComposerInputModeControls;
  disabled?: boolean;
}) {
  if (controls.textVoice?.supported) {
    return (
      <TextVoiceToggle
        mode={controls.textVoice.mode}
        onChange={controls.textVoice.onChange}
        disabled={disabled}
      />
    );
  }

  if (controls.tts?.supported) {
    return (
      <TtsToggle
        compact
        enabled={controls.tts.enabled}
        onToggle={controls.tts.onToggle}
        disabled={disabled}
      />
    );
  }

  return null;
}
