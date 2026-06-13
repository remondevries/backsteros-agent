import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  fetchLinearProjectWatcherConfig,
  updateLinearProjectWatcherConfig,
  type LinearProjectWatcherConfig,
} from "../../lib/api";
import { ResizablePanel } from "../ResizablePanel";

const LINEAR_WATCHER_SETTINGS_WIDTH_KEY = "backsteros.layout.linearWatcherSettingsWidth";

const POLL_INTERVAL_OPTIONS = [
  { value: 15_000, label: "Every 15 seconds" },
  { value: 30_000, label: "Every 30 seconds" },
  { value: 60_000, label: "Every 60 seconds" },
] as const;

function defaultWatcherConfig(): LinearProjectWatcherConfig {
  return {
    enabled: false,
    pollIntervalMs: 30_000,
    statusChangesOnly: true,
  };
}

function WatcherConfigSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="linear-issue-details-section">
      <header className="linear-issue-details-section-header">
        <span className="linear-issue-details-section-heading">
          <span className="linear-issue-details-section-chevron" aria-hidden="true">
            ▾
          </span>
          <h3 className="linear-issue-details-section-title">{title}</h3>
        </span>
      </header>
      <div className="linear-issue-details-section-body">{children}</div>
    </section>
  );
}

function WatcherConfigSettingsPanel({
  config,
  saving,
  error,
  savedMessage,
  onUpdate,
}: {
  config: LinearProjectWatcherConfig;
  saving: boolean;
  error: string | null;
  savedMessage: string | null;
  onUpdate: (patch: Partial<LinearProjectWatcherConfig>) => void;
}) {
  return (
    <div className="linear-issue-details-panel linear-issue-watchers-config-panel">
      {error ? <p className="linear-issue-watchers-config__error">{error}</p> : null}
      {savedMessage ? (
        <p className="linear-issue-watchers-config__saved">{savedMessage}</p>
      ) : null}

      <WatcherConfigSection title="Watcher">
        <p className="linear-issue-watchers-config__hint">
          Runs in the background even when you are not on this project.
        </p>
        <button
          type="button"
          className={[
            "linear-issue-watchers-config__enable-button",
            "linear-issue-watchers-config__enable-button--full",
            config.enabled ? "linear-issue-watchers-config__enable-button--active" : null,
          ]
            .filter(Boolean)
            .join(" ")}
          disabled={saving}
          aria-pressed={config.enabled}
          onClick={() => onUpdate({ enabled: !config.enabled })}
        >
          {config.enabled ? "Disable watcher" : "Enable watcher"}
        </button>
      </WatcherConfigSection>

      <WatcherConfigSection title="Polling">
        <label className="linear-issue-watchers-config__field">
          <span className="linear-issue-details-row-label">Poll interval</span>
          <select
            className="linear-issue-watchers-config__select"
            value={config.pollIntervalMs}
            disabled={saving || !config.enabled}
            onChange={(event) => onUpdate({ pollIntervalMs: Number(event.target.value) })}
          >
            {POLL_INTERVAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </WatcherConfigSection>

      <WatcherConfigSection title="Notifications">
        <label className="linear-issue-watchers-config__field linear-issue-watchers-config__field--toggle">
          <span>
            <span className="linear-issue-details-row-label">Status changes only</span>
            <span className="linear-issue-watchers-config__hint">
              Notify only when issue status changes or new issues appear.
            </span>
          </span>
          <input
            type="checkbox"
            className="linear-issue-watchers-config__checkbox"
            checked={config.statusChangesOnly}
            disabled={saving || !config.enabled}
            onChange={(event) => onUpdate({ statusChangesOnly: event.target.checked })}
          />
        </label>
      </WatcherConfigSection>
    </div>
  );
}

export function LinearIssueWatchersConfigPanel({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [config, setConfig] = useState<LinearProjectWatcherConfig>(() => defaultWatcherConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchLinearProjectWatcherConfig(projectId);
      if (result.error) {
        setError(result.error);
        setConfig(defaultWatcherConfig());
        return;
      }
      setConfig({
        ...defaultWatcherConfig(),
        ...result.config,
        projectName: result.config.projectName ?? projectName,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load watcher settings");
      setConfig(defaultWatcherConfig());
    } finally {
      setLoading(false);
    }
  }, [projectId, projectName]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const persistConfig = useCallback(
    async (next: LinearProjectWatcherConfig) => {
      setSaving(true);
      setError(null);
      setSavedMessage(null);
      try {
        const result = await updateLinearProjectWatcherConfig(projectId, {
          ...next,
          projectName,
        });
        if (result.error || !result.config) {
          setError(result.error ?? "Failed to save watcher settings");
          return;
        }
        setConfig(result.config);
        setSavedMessage("Watcher settings saved");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save watcher settings");
      } finally {
        setSaving(false);
      }
    },
    [projectId, projectName],
  );

  const updateConfig = useCallback(
    (patch: Partial<LinearProjectWatcherConfig>) => {
      setConfig((current) => {
        const next = { ...current, ...patch, projectName };
        void persistConfig(next);
        return next;
      });
    },
    [persistConfig, projectName],
  );

  return (
    <div className="linear-issue-layout linear-issue-watchers-config-layout">
      <div className="linear-issue-main">
        <div className="linear-issue-scroll linear-issue-watchers-log-scroll">
          <div className="linear-issue-watchers-log">
            <div className="linear-issue-watchers-log-empty" aria-live="polite">
              <p>Watcher activity will appear here.</p>
            </div>
          </div>
        </div>
      </div>

      <ResizablePanel
        side="right"
        className="app-resizable-panel-inset linear-issue-details-resizable"
        storageKey={LINEAR_WATCHER_SETTINGS_WIDTH_KEY}
        defaultWidth={300}
        minWidth={300}
        maxWidth={480}
        ariaLabel="Watcher settings"
      >
        <div className="linear-issue-details-shell">
          <div className="linear-issue-details-scroll">
            {loading ? (
              <p className="linear-issue-watchers-config__status">Loading watcher settings…</p>
            ) : (
              <WatcherConfigSettingsPanel
                config={config}
                saving={saving}
                error={error}
                savedMessage={savedMessage}
                onUpdate={updateConfig}
              />
            )}
          </div>
        </div>
      </ResizablePanel>
    </div>
  );
}
