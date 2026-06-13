import {
  linearWorkspaceViewsForKind,
  type LinearWorkspaceViewId,
} from "./linearProjectViews";
import {
  LinearProjectListBoardToggle,
  type LinearProjectCollectionMode,
  type LinearProjectCollectionToggleOption,
} from "./LinearProjectListBoardToggle";
import { WatcherPollProgressRing } from "./project-issues/WatcherPollProgressRing";
import { useLinearProjectWatcherPollProgress } from "../hooks/useLinearProjectWatcherPollProgress";

export function LinearProjectViewTabs({
  selectionKind,
  activeView,
  onChange,
  showCollectionModeToggle = false,
  collectionMode = "list",
  onCollectionModeChange,
  collectionToggleOptions,
  collectionToggleAriaLabel,
  showIssuesSettingsButton = false,
  issuesSettingsActive = false,
  onIssuesSettingsClick,
  issuesWatcherProjectId = null,
}: {
  selectionKind: "team" | "project";
  activeView: LinearWorkspaceViewId;
  onChange: (view: LinearWorkspaceViewId) => void;
  showCollectionModeToggle?: boolean;
  collectionMode?: LinearProjectCollectionMode;
  onCollectionModeChange?: (mode: LinearProjectCollectionMode) => void;
  collectionToggleOptions?: readonly LinearProjectCollectionToggleOption[];
  collectionToggleAriaLabel?: string;
  showIssuesSettingsButton?: boolean;
  issuesSettingsActive?: boolean;
  onIssuesSettingsClick?: () => void;
  issuesWatcherProjectId?: string | null;
}) {
  const views = linearWorkspaceViewsForKind(selectionKind);
  const showRightControls = showCollectionModeToggle || showIssuesSettingsButton;
  const { watcherActive, autoAssignActive, pollIntervalMs, animationKey } =
    useLinearProjectWatcherPollProgress(issuesWatcherProjectId, {
      settingsPanelOpen: issuesSettingsActive,
    });

  return (
    <div className="linear-project-view-tabs">
      <div className="linear-project-view-tabs-list" role="tablist" aria-label="Team and project views">
        {views.map((view) => {
          const active = activeView === view.id && !(issuesSettingsActive && view.id === "issues");
          return (
            <button
              key={view.id}
              type="button"
              role="tab"
              className={`linear-project-view-tab ${active ? "linear-project-view-tab-active" : ""}`}
              aria-selected={active}
              onClick={() => onChange(view.id)}
            >
              {view.label}
            </button>
          );
        })}
      </div>
      {showRightControls ? (
        <div className="linear-project-view-tabs-controls">
          {showCollectionModeToggle ? (
            <LinearProjectListBoardToggle
              mode={collectionMode}
              onChange={(mode) => onCollectionModeChange?.(mode)}
              options={collectionToggleOptions}
              ariaLabel={collectionToggleAriaLabel}
              neutral={issuesSettingsActive}
            />
          ) : null}
          {showIssuesSettingsButton ? (
            <button
              type="button"
              className={`linear-project-view-settings-button ${issuesSettingsActive ? "linear-project-view-settings-button-active" : ""}`}
              aria-label={
                watcherActive
                  ? autoAssignActive
                    ? "Issue watcher active, auto assign on"
                    : "Issue watcher active"
                  : "Issue settings"
              }
              aria-pressed={issuesSettingsActive}
              onClick={() => onIssuesSettingsClick?.()}
            >
              <WatcherPollProgressRing
                pollIntervalMs={pollIntervalMs}
                animationKey={animationKey}
                active={watcherActive}
                autoAssignActive={autoAssignActive}
              />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
