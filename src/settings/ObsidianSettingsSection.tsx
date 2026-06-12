import { open } from "@tauri-apps/plugin-dialog";

import { getSettingsTabStatusLabel, isSettingsTabConnected } from "./integrationConnectionStatus";

export function ObsidianSettingsSection({
  notesPath,
  defaultNotesPath,
  manualPath,
  manualVaultName,
  onManualPathChange,
  onManualVaultNameChange,
}: {
  notesPath: string | null;
  defaultNotesPath: string;
  manualPath: string;
  manualVaultName: string;
  onManualPathChange: (value: string) => void;
  onManualVaultNameChange: (value: string) => void;
}) {
  async function pickFolder() {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: notesPath ?? defaultNotesPath,
      });
      if (typeof selected === "string") {
        onManualPathChange(selected);
      }
    } catch {
      // Browser dev mode: keep manual path input
    }
  }

  const connectionContext = {
    integrationsStatus: null,
    savedNotesPath: notesPath,
  };
  const statusLabel = getSettingsTabStatusLabel("obsidian", connectionContext);

  return (
    <section className="settings-section">
      <p className="settings-hint settings-hint-spaced-top">
        Choose where Backster reads and writes markdown notes in your local vault. Saving creates
        the standard navigation folders (Inbox, Daily, Workouts, and the rest) when they are
        missing.
      </p>
      <p className="settings-hint">
        Status: <strong>{statusLabel}</strong>
        {!isSettingsTabConnected("obsidian", connectionContext) && (
          <>
            {" "}
            — save a notes folder below to connect your vault.
          </>
        )}
      </p>

      <label className="settings-field-label" htmlFor="notes-path-input">
        Notes folder
      </label>
      <p className="settings-hint">Select the folder where markdown notes live.</p>
      <div className="settings-row">
        <input
          id="notes-path-input"
          value={manualPath}
          onChange={(event) => onManualPathChange(event.target.value)}
          placeholder={defaultNotesPath}
        />
        <button type="button" className="btn-secondary" onClick={() => void pickFolder()}>
          Browse
        </button>
      </div>

      <label className="settings-field-label" htmlFor="vault-name-input">
        Vault name (optional)
      </label>
      <p className="settings-hint">
        Leave blank to use the folder name. Set this only when your local vault name differs from the folder name.
      </p>
      <div className="settings-row">
        <input
          id="vault-name-input"
          value={manualVaultName}
          onChange={(event) => onManualVaultNameChange(event.target.value)}
          placeholder="Folder name by default"
        />
      </div>
    </section>
  );
}
