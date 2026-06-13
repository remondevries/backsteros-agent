import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  fetchLinearProjectWatcherConfig,
  updateLinearProjectWatcherConfig,
  type LinearProjectWatcherConfig,
} from "../../lib/api";
import { useLinearProjectIssues } from "../../hooks/useLinearProjectIssues";
import {
  getLinearWatcherActivityLogEntries,
  subscribeToLinearWatcherActivityLog,
  type LinearWatcherActivityLogEntry,
} from "../../lib/linearWatcherActivityLog";
import { CursorIcon } from "../../chat/CursorIcon";
import { LinearIcon } from "../../chat/LinearIcon";
import { LinearStatusIcon } from "../../chat/LinearStatusIcon";
import { canonicalWatcherStatusKey } from "../../lib/linearIssueAgentDispatch";
import { ResizablePanel } from "../ResizablePanel";

const LINEAR_WATCHER_SETTINGS_WIDTH_KEY = "backsteros.layout.linearWatcherSettingsWidth";
const WATCHER_LOG_INITIAL_ROWS = 120;
const WATCHER_LOG_PAGE_ROWS = 120;
const WATCHER_LOG_MAX_ENTRIES = 2000;

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
    autoDispatchAgents: false,
    dispatchStatuses: [],
  };
}

function formatWatcherLogTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function normalizeStatusLabel(status?: string): string | null {
  const value = status?.trim();
  return value && value.length > 0 ? value : null;
}

function statusAtDetection(entry: LinearWatcherActivityLogEntry): string | null {
  return (
    normalizeStatusLabel(entry.currentStatus) ??
    normalizeStatusLabel(entry.issueStatus) ??
    normalizeStatusLabel(entry.previousStatus)
  );
}

function isStatusTransitionEntry(entry: LinearWatcherActivityLogEntry): boolean {
  return (
    entry.source === "watcher" &&
    entry.changeKind === "status_changed" &&
    Boolean(normalizeStatusLabel(entry.previousStatus) || normalizeStatusLabel(entry.currentStatus))
  );
}

function StatusToken({
  status,
  stateType,
}: {
  status?: string | null;
  stateType?: string;
}) {
  const statusLabel = normalizeStatusLabel(status ?? undefined);
  if (!statusLabel) return null;
  return (
    <span className="linear-issue-watchers-log-status-token" title={statusLabel}>
      <LinearStatusIcon status={statusLabel} stateType={stateType} title={statusLabel} />
    </span>
  );
}

function WatcherLogList({ entries }: { entries: LinearWatcherActivityLogEntry[] }) {
  return (
    <ol className="linear-issue-watchers-log-list" aria-live="polite">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className={[
            "linear-issue-watchers-log-item",
            entry.source === "agent" ? "linear-issue-watchers-log-item--agent" : null,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <time
            className="linear-issue-watchers-log-item-time"
            dateTime={entry.detectedAt}
            title={entry.detectedAt}
          >
            {formatWatcherLogTimestamp(entry.detectedAt)}
          </time>
          <div className="linear-issue-watchers-log-item-content">
            <div className="linear-issue-watchers-log-item-flow">
              <span className="linear-issue-watchers-log-source-icon-shell" aria-hidden="true">
                {entry.source === "agent" ? (
                  <CursorIcon className="linear-issue-watchers-log-source-icon" size={14} />
                ) : (
                  <LinearIcon className="linear-issue-watchers-log-source-icon" size={14} />
                )}
              </span>
              {isStatusTransitionEntry(entry) ? (
                <>
                  <StatusToken status={entry.previousStatus ?? null} />
                  <span className="linear-issue-watchers-log-arrow" aria-hidden="true">
                    →
                  </span>
                  <StatusToken
                    status={entry.currentStatus ?? statusAtDetection(entry)}
                    stateType={entry.issueStateType}
                  />
                </>
              ) : (
                <>
                  <span className="linear-issue-watchers-log-arrow" aria-hidden="true">
                    →
                  </span>
                  <StatusToken
                    status={statusAtDetection(entry)}
                    stateType={entry.issueStateType}
                  />
                </>
              )}
              <span className="linear-issue-watchers-log-item-identifier">{entry.identifier}</span>
              <span className="linear-issue-watchers-log-item-title">{entry.title}</span>
            </div>
            {entry.summary.trim().length > 0 &&
            !(
              (isStatusTransitionEntry(entry) ||
                Boolean(statusAtDetection(entry)) ||
                entry.source === "agent") &&
              entry.changeKind !== "updated"
            ) ? (
              <p className="linear-issue-watchers-log-item-summary">{entry.summary}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
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
  workflowStates,
  onUpdate,
}: {
  config: LinearProjectWatcherConfig;
  saving: boolean;
  error: string | null;
  savedMessage: string | null;
  workflowStates: Array<{ id: string; name: string; type: string; color?: string }>;
  onUpdate: (patch: Partial<LinearProjectWatcherConfig>) => void;
}) {
  const dispatchStatusKeys = useMemo(() => {
    const keys = new Set(
      (config.dispatchStatuses ?? []).map((status) => canonicalWatcherStatusKey(status)),
    );
    return keys;
  }, [config.dispatchStatuses]);

  const toggleDispatchStatus = (statusName: string) => {
    const key = canonicalWatcherStatusKey(statusName);
    if (!key) return;
    const current = config.dispatchStatuses ?? [];
    const next = dispatchStatusKeys.has(key)
      ? current.filter((status) => canonicalWatcherStatusKey(status) !== key)
      : [...current, statusName.trim()];
    onUpdate({ dispatchStatuses: next });
  };

  const agentsReady =
    config.enabled &&
    config.autoDispatchAgents &&
    (config.dispatchStatuses?.length ?? 0) > 0;

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

      <WatcherConfigSection title="Agent dispatch">
        <p className="linear-issue-watchers-config__hint">
          When an issue enters a selected status, Backster opens an issue terminal and
          starts the Cursor agent automatically.
        </p>
        <label className="linear-issue-watchers-config__field linear-issue-watchers-config__field--toggle">
          <span>
            <span className="linear-issue-details-row-label">Auto-dispatch agents</span>
            <span className="linear-issue-watchers-config__hint">
              Requires the watcher and a configured projects folder in Settings.
            </span>
          </span>
          <input
            type="checkbox"
            className="linear-issue-watchers-config__checkbox"
            checked={config.autoDispatchAgents ?? false}
            disabled={saving || !config.enabled}
            onChange={(event) => onUpdate({ autoDispatchAgents: event.target.checked })}
          />
        </label>
        {config.autoDispatchAgents ? (
          <>
            <p className="linear-issue-watchers-config__hint linear-issue-watchers-config__hint--spaced">
              Dispatch when an issue enters one of these statuses:
            </p>
            {workflowStates.length > 0 ? (
              <ul className="linear-issue-watchers-config__status-list">
                {workflowStates.map((state) => {
                  const checked = dispatchStatusKeys.has(canonicalWatcherStatusKey(state.name));
                  return (
                    <li key={state.id} className="linear-issue-watchers-config__status-item">
                      <label className="linear-issue-watchers-config__status-label">
                        <input
                          type="checkbox"
                          className="linear-issue-watchers-config__checkbox"
                          checked={checked}
                          disabled={saving || !config.enabled}
                          onChange={() => toggleDispatchStatus(state.name)}
                        />
                        <LinearStatusIcon
                          status={state.name}
                          stateType={state.type}
                          title={state.name}
                        />
                        <span>{state.name}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="linear-issue-watchers-config__status">
                Load project issues to pick workflow statuses.
              </p>
            )}
            {agentsReady ? (
              <p className="linear-issue-watchers-config__saved">
                Agent dispatch is armed for this project.
              </p>
            ) : (
              <p className="linear-issue-watchers-config__hint">
                Select at least one status to arm agent dispatch.
              </p>
            )}
          </>
        ) : null}
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
  const [logVersion, setLogVersion] = useState(0);
  const [visibleRows, setVisibleRows] = useState(WATCHER_LOG_INITIAL_ROWS);
  const { workflowStates } = useLinearProjectIssues(projectId, true);

  useEffect(() => {
    return subscribeToLinearWatcherActivityLog((entry) => {
      if (entry.projectId !== projectId) return;
      setLogVersion((current) => current + 1);
      setVisibleRows((current) => current + 1);
    });
  }, [projectId]);

  useEffect(() => {
    setVisibleRows(WATCHER_LOG_INITIAL_ROWS);
  }, [projectId]);

  const logEntries = useMemo(
    () =>
      getLinearWatcherActivityLogEntries({
        projectId,
        limit: WATCHER_LOG_MAX_ENTRIES,
      }),
    [logVersion, projectId],
  );
  const visibleLogEntries = useMemo(
    () => logEntries.slice(0, visibleRows),
    [logEntries, visibleRows],
  );
  const canLoadMoreLogs = visibleLogEntries.length < logEntries.length;
  const remainingLogRows = logEntries.length - visibleLogEntries.length;

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
            {logEntries.length > 0 ? (
              <>
                <p className="linear-issue-watchers-log-count">
                  Showing {visibleLogEntries.length} of {logEntries.length} recent watcher and agent
                  events.
                </p>
                <WatcherLogList entries={visibleLogEntries} />
                {canLoadMoreLogs ? (
                  <div className="linear-issue-watchers-log-actions">
                    <button
                      type="button"
                      className="linear-issue-watchers-log-load-more"
                      onClick={() => {
                        setVisibleRows((current) =>
                          Math.min(logEntries.length, current + WATCHER_LOG_PAGE_ROWS),
                        );
                      }}
                    >
                      Load {Math.min(WATCHER_LOG_PAGE_ROWS, remainingLogRows)} more
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="linear-issue-watchers-log-empty" aria-live="polite">
                <p>Watcher and agent activity will appear here.</p>
              </div>
            )}
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
                workflowStates={workflowStates}
                onUpdate={updateConfig}
              />
            )}
          </div>
        </div>
      </ResizablePanel>
    </div>
  );
}
