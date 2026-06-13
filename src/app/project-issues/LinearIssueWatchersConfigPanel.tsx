import { useCallback, useEffect, useState } from "react";
import {
  fetchLinearProjectWatcherConfig,
  updateLinearProjectWatcherConfig,
  type LinearProjectWatcherConfig,
} from "../../lib/api";

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

  if (loading) {
    return (
      <div className="linear-issue-watchers-config">
        <p className="linear-issue-watchers-config__status">Loading watcher settings…</p>
      </div>
    );
  }

  return (
    <div className="linear-issue-watchers-config">
      <header className="linear-issue-watchers-config__header">
        <div>
          <h2 className="linear-issue-watchers-config__title">Issue watchers</h2>
          <p className="linear-issue-watchers-config__subtitle">
            Poll Linear for changes in <strong>{projectName}</strong> and show global notifications
            when issues update.
          </p>
        </div>
        {savedMessage ? (
          <span className="linear-issue-watchers-config__saved">{savedMessage}</span>
        ) : null}
      </header>

      {error ? <p className="linear-issue-watchers-config__error">{error}</p> : null}

      <section className="linear-issue-watchers-config__section">
        <label className="linear-issue-watchers-config__row">
          <span>
            <span className="linear-issue-watchers-config__label">Enable watcher</span>
            <span className="linear-issue-watchers-config__hint">
              Runs in the background even when you are not on this project.
            </span>
          </span>
          <input
            type="checkbox"
            checked={config.enabled}
            disabled={saving}
            onChange={(event) => updateConfig({ enabled: event.target.checked })}
          />
        </label>

        <label className="linear-issue-watchers-config__row">
          <span className="linear-issue-watchers-config__label">Poll interval</span>
          <select
            className="linear-issue-watchers-config__select"
            value={config.pollIntervalMs}
            disabled={saving || !config.enabled}
            onChange={(event) =>
              updateConfig({ pollIntervalMs: Number(event.target.value) })
            }
          >
            {POLL_INTERVAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="linear-issue-watchers-config__row">
          <span>
            <span className="linear-issue-watchers-config__label">Status changes only</span>
            <span className="linear-issue-watchers-config__hint">
              Notify only when issue status changes or new issues appear.
            </span>
          </span>
          <input
            type="checkbox"
            checked={config.statusChangesOnly}
            disabled={saving || !config.enabled}
            onChange={(event) => updateConfig({ statusChangesOnly: event.target.checked })}
          />
        </label>
      </section>
    </div>
  );
}
