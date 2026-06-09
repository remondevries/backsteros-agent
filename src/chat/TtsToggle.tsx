function VoiceModeIcon({ enabled }: { enabled: boolean }) {
  if (enabled) {
    return (
      <svg className="composer-tts-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M19.114 5.63601C19.9497 6.47174 20.6127 7.4639 21.065 8.55583C21.5173 9.64777 21.7501 10.8181 21.7501 12C21.7501 13.1819 21.5173 14.3522 21.065 15.4442C20.6127 16.5361 19.9497 17.5283 19.114 18.364M16.463 8.28801C17.4474 9.27255 18.0004 10.6078 18.0004 12C18.0004 13.3922 17.4474 14.7275 16.463 15.712M6.75 8.25001L11.47 3.53001C11.5749 3.42525 11.7085 3.35393 11.8539 3.32504C11.9993 3.29616 12.15 3.31101 12.2869 3.36772C12.4239 3.42443 12.541 3.52046 12.6234 3.64368C12.7058 3.76689 12.7499 3.91177 12.75 4.06001V19.94C12.7499 20.0883 12.7058 20.2331 12.6234 20.3563C12.541 20.4796 12.4239 20.5756 12.2869 20.6323C12.15 20.689 11.9993 20.7039 11.8539 20.675C11.7085 20.6461 11.5749 20.5748 11.47 20.47L6.75 15.75H4.51C3.63 15.75 2.806 15.243 2.572 14.396C2.35751 13.6154 2.2492 12.8095 2.25 12C2.25 11.17 2.362 10.367 2.572 9.60401C2.806 8.75601 3.63 8.25001 4.51 8.25001H6.75Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg className="composer-tts-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12.75 16V19.94C12.7499 20.0883 12.7058 20.2331 12.6234 20.3563C12.541 20.4796 12.4239 20.5756 12.2869 20.6323C12.15 20.689 11.9993 20.7039 11.8539 20.675C11.7085 20.6461 11.5749 20.5748 11.47 20.47L6.75 15.75H4.51C3.63 15.75 2.806 15.243 2.572 14.396C2.35751 13.6154 2.2492 12.8095 2.25 12C2.25 11.17 2.362 10.367 2.572 9.60401C2.806 8.75601 3.63 8.25001 4.51 8.25001H5M12.75 11V4.06001C12.7499 3.91177 12.7058 3.76689 12.6234 3.64368C12.541 3.52046 12.4239 3.42443 12.2869 3.36772C12.15 3.31101 11.9993 3.29616 11.8539 3.32504C11.7085 3.35393 11.5749 3.42525 11.47 3.53001L8.5 6.50001"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 3L18 19"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TtsIcon({
  enabled,
  mode = "tts",
}: {
  enabled: boolean;
  mode?: "tts" | "voice";
}) {
  if (mode === "voice") {
    return <VoiceModeIcon enabled={enabled} />;
  }

  return (
    <svg className="composer-tts-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3.5 6.25h1.75L7.25 4v8L5.25 9.75H3.5a.75.75 0 0 1-.75-.75v-2a.75.75 0 0 1 .75-.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {enabled ? (
        <>
          <path
            d="M9.25 6.5a2.5 2.5 0 0 1 0 3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
          />
          <path
            d="M11 5a4 4 0 0 1 0 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </>
      ) : (
        <path
          d="M2.5 2.5 13.5 13.5"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export function TtsToggle({
  enabled,
  onToggle,
  disabled,
  compact,
  mode = "tts",
}: {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
  compact?: boolean;
  mode?: "tts" | "voice";
}) {
  const isVoiceMode = mode === "voice";
  const labelOn = isVoiceMode ? "Disable voice mode" : "Disable read aloud";
  const labelOff = isVoiceMode ? "Enable voice mode" : "Enable read aloud";
  const titleOn = isVoiceMode
    ? "Voice mode (on) — hold Space to speak"
    : "Read responses aloud (on)";
  const titleOff = isVoiceMode ? "Voice mode (off)" : "Read responses aloud (off)";
  const buttonLabel = isVoiceMode ? "Voice mode" : "Read aloud";

  if (compact) {
    return (
      <button
        type="button"
        className={`composer-icon-button composer-tts ${enabled ? "active" : ""}`}
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={enabled}
        aria-label={enabled ? labelOn : labelOff}
        title={enabled ? titleOn : titleOff}
      >
        <TtsIcon enabled={enabled} mode={mode} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`tts-toggle ${enabled ? "active" : ""}`}
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={enabled}
      aria-label={enabled ? labelOn : labelOff}
      title={enabled ? titleOn : titleOff}
    >
      <svg className="tts-toggle-icon" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M7.563 2.069A.75.75 0 0 1 8 2.75v10.5a.751.751 0 0 1-1.238.57L3.472 11H1.75A1.75 1.75 0 0 1 0 9.25v-2.5C0 5.784.784 5 1.75 5h1.723l3.289-2.82a.75.75 0 0 1 .801-.111ZM6.5 4.38 4.238 6.319a.748.748 0 0 1-.488.181h-2a.25.25 0 0 0-.25.25v2.5c0 .138.112.25.25.25h2c.179 0 .352.064.488.18L6.5 11.62Zm6.096-2.038a.75.75 0 0 1 1.06 0 8 8 0 0 1 0 11.314.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042 6.5 6.5 0 0 0 0-9.193.75.75 0 0 1 0-1.06Zm-1.06 2.121-.001.001a5 5 0 0 1 0 7.07.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734 3.5 3.5 0 0 0 0-4.95.75.75 0 1 1 1.061-1.061Z"
          fill="currentColor"
          opacity={enabled ? 1 : 0.5}
        />
        {!enabled && (
          <path
            d="M2 2l12 12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        )}
      </svg>
      <span>{buttonLabel}</span>
    </button>
  );
}
