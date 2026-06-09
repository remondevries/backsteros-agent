export type InputMode = "text" | "voice";

export function TextVoiceToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: InputMode;
  onChange: (mode: InputMode) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="text-voice-toggle"
      role="group"
      aria-label="Input mode — toggle with Ctrl+V"
      data-mode={mode}
      title="Toggle text / voice (Ctrl+V)"
    >
      <span className="text-voice-indicator" aria-hidden="true" />
      <button
        type="button"
        className={`text-voice-option ${mode === "text" ? "active" : ""}`}
        onClick={() => onChange("text")}
        disabled={disabled}
        aria-pressed={mode === "text"}
      >
        Text
      </button>
      <button
        type="button"
        className={`text-voice-option ${mode === "voice" ? "active active-voice" : ""}`}
        onClick={() => onChange("voice")}
        disabled={disabled}
        aria-pressed={mode === "voice"}
      >
        Voice
      </button>
    </div>
  );
}
