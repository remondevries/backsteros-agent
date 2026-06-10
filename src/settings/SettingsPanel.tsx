import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";
import { ComposerModeToggle } from "../chat/ComposerModeToggle";
import { TtsToggle } from "../chat/TtsToggle";
import {
  composerModeFromSettings,
  settingsFromComposerMode,
  type ComposerMode,
} from "../chat/composerMode";
import type { LinearIssueLinkMode } from "../chat/types";
import { useTts } from "../hooks/useTts";
import { getSettings, updateSettings } from "../lib/api";
import { setLinearIssueLinkMode } from "../lib/linear/linearLink";
import { openLocalFile } from "../lib/openExternalUrl";
import { resolveProfilePaths } from "../lib/profilePaths";

export function SettingsPanel({
  notesPath,
  vaultName,
  defaultNotesPath,
  initialModelMode: _initialModelMode = "auto",
  initialUserProfilePath,
  initialAgentProfilePath,
  onUpdated,
}: {
  notesPath: string | null;
  vaultName?: string | null;
  defaultNotesPath: string;
  initialModelMode?: string;
  initialUserProfilePath?: string;
  initialAgentProfilePath?: string;
  onUpdated: (path: string, nextVaultName?: string | null) => void;
}) {
  const [manualPath, setManualPath] = useState(notesPath ?? defaultNotesPath);
  const [manualVaultName, setManualVaultName] = useState(vaultName ?? "");
  const [composerMode, setComposerMode] = useState<ComposerMode>("auto");
  const [issueLinkMode, setIssueLinkMode] = useState<LinearIssueLinkMode>("external");
  const [userProfilePath, setUserProfilePath] = useState<string | null>(
    initialUserProfilePath ?? null,
  );
  const [agentProfilePath, setAgentProfilePath] = useState<string | null>(
    initialAgentProfilePath ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { enabled: ttsEnabled, toggle: toggleTts, supported: ttsSupported } = useTts();

  useEffect(() => {
    void (async () => {
      const settings = await getSettings().catch(() => null);
      if (settings) {
        setComposerMode(
          composerModeFromSettings(settings.executionMode, settings.modelMode),
        );
      }
      if (settings?.issueLinkMode) {
        setIssueLinkMode(settings.issueLinkMode);
        setLinearIssueLinkMode(settings.issueLinkMode);
      }
      const paths = await resolveProfilePaths({
        userProfilePath: initialUserProfilePath ?? settings?.userProfilePath,
        agentProfilePath: initialAgentProfilePath ?? settings?.agentProfilePath,
      });
      setUserProfilePath(paths.userProfilePath);
      setAgentProfilePath(paths.agentProfilePath);
    })();
  }, [initialAgentProfilePath, initialUserProfilePath]);

  async function pickFolder() {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: notesPath ?? defaultNotesPath,
      });
      if (typeof selected === "string") {
        setManualPath(selected);
      }
    } catch {
      // Browser dev mode: keep manual path input
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const result = await updateSettings({
        notesPath: manualPath,
        vaultName: manualVaultName.trim() || null,
        ...settingsFromComposerMode(composerMode),
        issueLinkMode,
      });
      setComposerMode(
        composerModeFromSettings(result.executionMode, result.modelMode),
      );
      setIssueLinkMode(result.issueLinkMode);
      setLinearIssueLinkMode(result.issueLinkMode);
      onUpdated(manualPath, result.vaultName ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-panel">
      <h2>Workspace</h2>
      <p>Select the folder where markdown notes live.</p>
      <div className="settings-row">
        <input
          value={manualPath}
          onChange={(event) => setManualPath(event.target.value)}
          placeholder={defaultNotesPath}
        />
        <button type="button" className="btn-secondary" onClick={pickFolder}>
          Browse
        </button>
      </div>

      <label className="settings-field-label" htmlFor="vault-name-input">
        Obsidian vault name (optional)
      </label>
      <p className="settings-hint">
        Leave blank to use the folder name. Set this only when Obsidian shows a different vault name.
      </p>
      <div className="settings-row">
        <input
          id="vault-name-input"
          value={manualVaultName}
          onChange={(event) => setManualVaultName(event.target.value)}
          placeholder="Folder name by default"
        />
      </div>

      <h2 className="settings-section-title">Profiles</h2>
      <p>Edit Backster&apos;s persona and your identity context. Changes apply on the next message.</p>
      <div className="settings-row settings-row-profiles">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            if (agentProfilePath) {
              void openLocalFile(agentProfilePath);
            }
          }}
        >
          Edit agent persona
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            if (userProfilePath) {
              void openLocalFile(userProfilePath);
            }
          }}
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

      <h2 className="settings-section-title">Linear</h2>
      <p>Choose how Linear issue links open when you click them in chat or the Linear view.</p>
      <label className="settings-field-label" htmlFor="issue-link-mode">
        Linear link type
      </label>
      <div className="settings-row settings-row-select">
        <select
          id="issue-link-mode"
          value={issueLinkMode}
          disabled={saving}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "external" || value === "internal") {
              setIssueLinkMode(value);
            }
          }}
        >
          <option value="external">Web URL (browser)</option>
          <option value="internal">Application URL (Linear app)</option>
        </select>
      </div>
      <p className="settings-hint settings-hint-spaced">
        Application URL uses the Linear desktop app via <code>linear://</code> links.
      </p>

      <h2 className="settings-section-title">Composer</h2>
      <p>
        Test runs automation playbooks with deterministic local responses. Auto uses the fast model.
        Max uses the latest Opus model.
      </p>
      <div className="settings-row settings-row-model">
        <ComposerModeToggle
          mode={composerMode}
          onChange={setComposerMode}
          disabled={saving}
        />
      </div>
      <p className="settings-hint settings-hint-spaced">
        You can also set <code>BACKSTER_EXECUTION_MODE=test</code> for one-off runs.
      </p>

      <h2 className="settings-section-title">Accessibility</h2>
      <p>Read assistant responses aloud when they finish.</p>
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

      <div className="settings-footer">
        {error && <p className="error-text settings-footer-error">{error}</p>}
        <button type="button" className="btn-primary settings-save-button" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
