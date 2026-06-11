import { ComposerModeToggle } from "../chat/ComposerModeToggle";
import { TtsToggle } from "../chat/TtsToggle";
import type { ComposerMode } from "../chat/composerMode";
import { useTts } from "../hooks/useTts";
import { useUiPreview } from "../chat/dev/UiPreviewContext";

export function GeneralSettingsSection({
  composerMode,
  saving,
  userProfilePath,
  agentProfilePath,
  onComposerModeChange,
  onEditAgentProfile,
  onEditUserProfile,
}: {
  composerMode: ComposerMode;
  saving: boolean;
  userProfilePath: string | null;
  agentProfilePath: string | null;
  onComposerModeChange: (mode: ComposerMode) => void;
  onEditAgentProfile: () => void;
  onEditUserProfile: () => void;
}) {
  const { enabled: ttsEnabled, toggle: toggleTts, supported: ttsSupported } = useTts();

  const { enabled: uiPreviewEnabled, open: uiPreviewOpen, toggle: toggleUiPreview } =
    useUiPreview();

  return (
    <>
      <section className="settings-section">
        <h3 className="settings-subsection-title">Profiles</h3>
        <p className="settings-hint settings-hint-spaced-top">
          Edit Backster&apos;s persona and your identity context. Changes apply on the next message.
        </p>
        <div className="settings-row settings-row-profiles">
          <button
            type="button"
            className="btn-secondary"
            onClick={onEditAgentProfile}
          >
            Edit agent persona
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onEditUserProfile}
          >
            Edit user profile
          </button>
        </div>
        {(agentProfilePath || userProfilePath) && (
          <p className="settings-hint settings-hint-spaced">
            {agentProfilePath && <>Agent: {agentProfilePath}</>}
            {agentProfilePath && userProfilePath && " · "}
            {userProfilePath && <>User: {userProfilePath}</>}
          </p>
        )}
      </section>

      <section className="settings-section">
        <h3 className="settings-subsection-title">Accessibility</h3>
        <p className="settings-hint settings-hint-spaced-top">
          Read assistant responses aloud when they finish.
        </p>
        <div className="settings-row settings-row-tts">
          {ttsSupported ? (
            <TtsToggle enabled={ttsEnabled} onToggle={toggleTts} />
          ) : (
            <p className="settings-hint">Text-to-speech is not available in this environment.</p>
          )}
        </div>
        {ttsSupported && (
          <p className="settings-hint settings-hint-spaced">
            Uses the local Cori UK voice (Piper, offline).
          </p>
        )}
      </section>

      <section className="settings-section">
        <h3 className="settings-subsection-title">Composer</h3>
        <p className="settings-hint settings-hint-spaced-top">
          Test runs automation playbooks with deterministic local responses. Auto uses the fast model.
          Max uses the latest Opus model.
        </p>
        <div className="settings-row settings-row-model">
          <ComposerModeToggle
            mode={composerMode}
            onChange={onComposerModeChange}
            disabled={saving}
          />
        </div>
        <p className="settings-hint settings-hint-spaced">
          You can also set <code>BACKSTER_EXECUTION_MODE=test</code> for one-off runs.
        </p>
      </section>

      {uiPreviewEnabled && (
        <section className="settings-section">
          <h3 className="settings-subsection-title">Developer</h3>
          <p className="settings-hint settings-hint-spaced-top">
            Preview run UI fixtures for Linear, Obsidian, Calendar, and Whoop blocks.
          </p>
          <div className="settings-row settings-row-profiles">
            <button
              type="button"
              className={[
                "btn-secondary",
                uiPreviewOpen ? "run-ui-preview-toggle active" : "run-ui-preview-toggle",
              ].join(" ")}
              onClick={toggleUiPreview}
            >
              {uiPreviewOpen ? "Close UI preview" : "Open UI preview"}
            </button>
          </div>
          <p className="settings-hint settings-hint-spaced">
            Shortcut: <code>Cmd+Shift+L</code>
          </p>
        </section>
      )}
    </>
  );
}
