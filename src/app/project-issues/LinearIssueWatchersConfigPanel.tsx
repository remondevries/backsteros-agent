import { useCallback, useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  fetchLinearProjectWatcherConfig,
  updateLinearProjectWatcherConfig,
  type LinearProjectWatcherConfig,
} from "../../lib/api";
import { useLinearProjectIssues } from "../../hooks/useLinearProjectIssues";
import { useContentPanelBarState } from "../../hooks/useContentPanelBarState";
import {
  getLinearWatcherActivityLogEntries,
  subscribeToLinearWatcherActivityLog,
  type LinearWatcherActivityLogEntry,
} from "../../lib/linearWatcherActivityLog";
import { CursorIcon } from "../../chat/CursorIcon";
import { LinearIcon } from "../../chat/LinearIcon";
import { LinearStatusIcon } from "../../chat/LinearStatusIcon";
import { canonicalWatcherStatusKey } from "../../lib/linearIssueAgentDispatch";
import { publishWatcherConfigSync } from "../../lib/linearWatcherConfigSync";
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

const AUTO_ASSIGN_INFO_TOOLTIP = "Requires a configured projects folder in Settings.";
const AUTO_ASSIGN_STATUS_TOOLTIP = "Select at least one status before enabling auto assign.";
const AUTO_ASSIGN_WATCHER_TOOLTIP = "Turn the watcher on before enabling auto assign.";

function getAutoAssignInfoTooltip(watcherEnabled: boolean, dispatchStatusCount: number): string {
  if (dispatchStatusCount === 0) {
    return AUTO_ASSIGN_STATUS_TOOLTIP;
  }
  if (!watcherEnabled) {
    return AUTO_ASSIGN_WATCHER_TOOLTIP;
  }
  return AUTO_ASSIGN_INFO_TOOLTIP;
}

function WatcherInfoTooltip({ text }: { text: string }) {
  return (
    <span className="backster-info-tooltip-wrap">
      <button
        type="button"
        className="backster-info-tooltip-trigger"
        aria-label="More information"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.25" />
          <path
            d="M8 7.1v4.2M8 5.4h.01"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <span role="tooltip" className="backster-info-tooltip backster-info-tooltip--info">
        {text}
      </span>
    </span>
  );
}

function WatcherToggleCard({
  enabled,
  disabled,
  label,
  ariaLabel,
  onChange,
  variant = "watcher",
  infoTooltip,
}: {
  enabled: boolean;
  disabled?: boolean;
  label: string;
  ariaLabel: string;
  onChange: (enabled: boolean) => void;
  variant?: "watcher" | "dispatch";
  infoTooltip?: string;
}) {
  const isDispatch = variant === "dispatch";
  const cardClassName = [
    "linear-issue-details-section",
    isDispatch ? "linear-issue-watchers-dispatch-card" : "linear-issue-watchers-enable-card",
    infoTooltip ? "linear-issue-watchers-toggle-card--with-info" : null,
    enabled
      ? isDispatch
        ? "linear-issue-watchers-dispatch-card--on"
        : "linear-issue-watchers-enable-card--on"
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  const labelClassName = [
    "linear-issue-watchers-enable-label",
    enabled
      ? isDispatch
        ? "linear-issue-watchers-enable-label--dispatch-on"
        : "linear-issue-watchers-enable-label--on"
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  const toggleClassName = [
    "watcher-ios-toggle",
    enabled
      ? isDispatch
        ? "watcher-ios-toggle--dispatch-on"
        : "watcher-ios-toggle--on"
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  const handleToggle = () => {
    if (disabled) return;
    onChange(!enabled);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (disabled) return;
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      onChange(!enabled);
    }
  };

  if (infoTooltip) {
    return (
      <div
        role="switch"
        aria-checked={enabled}
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        className={cardClassName}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
      >
        <span className={labelClassName}>{label}</span>
        <WatcherInfoTooltip text={infoTooltip} />
        <span className={toggleClassName} aria-hidden="true">
          <span className="watcher-ios-toggle__thumb" />
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      className={cardClassName}
      disabled={disabled}
      onClick={handleToggle}
    >
      <span className={labelClassName}>{label}</span>
      <span className={toggleClassName} aria-hidden="true">
        <span className="watcher-ios-toggle__thumb" />
      </span>
    </button>
  );
}

function WatcherEnableToggle({
  enabled,
  disabled,
  onChange,
}: {
  enabled: boolean;
  disabled?: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <WatcherToggleCard
      enabled={enabled}
      disabled={disabled}
      label={enabled ? "On" : "Off"}
      ariaLabel={`Watcher ${enabled ? "on" : "off"}`}
      onChange={onChange}
    />
  );
}

function WatcherAutoDispatchToggle({
  enabled,
  disabled,
  watcherEnabled,
  dispatchStatusCount,
  onChange,
}: {
  enabled: boolean;
  disabled?: boolean;
  watcherEnabled: boolean;
  dispatchStatusCount: number;
  onChange: (enabled: boolean) => void;
}) {
  const infoTooltip = getAutoAssignInfoTooltip(watcherEnabled, dispatchStatusCount);

  return (
    <WatcherToggleCard
      enabled={enabled}
      disabled={disabled}
      label="Auto assign"
      ariaLabel={`Auto assign ${enabled ? "on" : "off"}`}
      onChange={onChange}
      variant="dispatch"
      infoTooltip={infoTooltip}
    />
  );
}

function WatcherConfigSection({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="linear-issue-details-section">
      {title ? (
        <header className="linear-issue-details-section-header">
          <span className="linear-issue-details-section-heading">
            <span className="linear-issue-details-section-chevron" aria-hidden="true">
              ▾
            </span>
            <h3 className="linear-issue-details-section-title">{title}</h3>
          </span>
        </header>
      ) : null}
      <div className="linear-issue-details-section-body">{children}</div>
    </section>
  );
}

function WatcherConfigSettingsPanel({
  config,
  saving,
  error,
  workflowStates,
  onUpdate,
}: {
  config: LinearProjectWatcherConfig;
  saving: boolean;
  error: string | null;
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
    const patch: Partial<LinearProjectWatcherConfig> = { dispatchStatuses: next };
    if (next.length === 0 && config.autoDispatchAgents) {
      patch.autoDispatchAgents = false;
    }
    onUpdate(patch);
  };

  const dispatchStatusCount = config.dispatchStatuses?.length ?? 0;
  const canEnableWatcher =
    !config.autoDispatchAgents || dispatchStatusCount > 0;

  return (
    <div className="linear-issue-details-panel linear-issue-watchers-config-panel">
      <WatcherEnableToggle
        enabled={config.enabled}
        disabled={saving || (!config.enabled && !canEnableWatcher)}
        onChange={(enabled) => onUpdate({ enabled })}
      />
      <WatcherAutoDispatchToggle
        enabled={config.autoDispatchAgents ?? false}
        disabled={saving || !config.enabled || dispatchStatusCount === 0}
        watcherEnabled={config.enabled}
        dispatchStatusCount={dispatchStatusCount}
        onChange={(autoDispatchAgents) => onUpdate({ autoDispatchAgents })}
      />
      {config.autoDispatchAgents && !config.enabled ? (
        <p className="linear-issue-watchers-config__hint linear-issue-watchers-config__hint--toggle-followup">
          Turn the watcher on to start dispatching agents.
        </p>
      ) : null}
      {!canEnableWatcher ? (
        <p className="linear-issue-watchers-config__hint linear-issue-watchers-config__hint--enable">
          Select at least one dispatch status before enabling the watcher with
          auto assign on.
        </p>
      ) : null}

      {error ? <p className="linear-issue-watchers-config__error">{error}</p> : null}

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

      <WatcherConfigSection title="Status">
        <p className="linear-issue-watchers-config__hint">
          Trigger agents when an issue enters a selected status.
        </p>
        {workflowStates.length > 0 ? (
          <ul className="linear-issue-watchers-config__status-list">
            {workflowStates.map((state) => {
              const checked = dispatchStatusKeys.has(canonicalWatcherStatusKey(state.name));
              return (
                <li key={state.id} className="linear-issue-watchers-config__status-item">
                  <label
                    className={[
                      "linear-issue-watchers-config__status-label",
                      checked ? "linear-issue-watchers-config__status-label--checked" : null,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <input
                      type="checkbox"
                      className="linear-issue-watchers-config__status-checkbox"
                      checked={checked}
                      disabled={saving}
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

  useEffect(() => {
    if (!savedMessage) return;
    const timeoutId = window.setTimeout(() => setSavedMessage(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [savedMessage]);

  useContentPanelBarState({
    saving,
    error,
    savedMessage,
    loading,
    loadingMessage: "Loading watcher settings…",
    refreshing: saving || loading,
    onRefresh: () => {
      void loadConfig();
    },
  });

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
        publishWatcherConfigSync(projectId, {
          enabled: result.config.enabled,
          pollIntervalMs: result.config.pollIntervalMs,
          autoDispatchAgents: result.config.autoDispatchAgents ?? false,
        });
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
