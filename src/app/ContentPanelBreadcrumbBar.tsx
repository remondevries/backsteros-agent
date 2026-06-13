import type { ContentPanelBreadcrumbSegment } from "./contentPanelNavigation";
import { useContentPanelNavigation } from "./contentPanelNavigation";
import { ContentPanelBreadcrumb } from "./ContentPanelBreadcrumb";
import { WatcherPollProgressRing } from "./project-issues/WatcherPollProgressRing";
import { LinearIssueViewModeToggle } from "./project-issues/LinearIssueViewModeToggle";

export function ContentPanelBreadcrumbBar({
  segments,
}: {
  segments: ContentPanelBreadcrumbSegment[];
}) {
  const { issuesWatcherAction, issueViewModeAction } = useContentPanelNavigation();

  return (
    <header className="content-panel-breadcrumb-bar">
      <ContentPanelBreadcrumb segments={segments} />
      {issuesWatcherAction || issueViewModeAction ? (
        <div className="content-panel-breadcrumb-actions">
          {issueViewModeAction ? (
            <LinearIssueViewModeToggle
              mode={issueViewModeAction.mode}
              onChange={issueViewModeAction.onChange}
              terminalSessionActive={issueViewModeAction.terminalSessionActive}
              terminalAgentWorking={issueViewModeAction.terminalAgentWorking}
              terminalAgentWaiting={issueViewModeAction.terminalAgentWaiting}
            />
          ) : null}
          {issuesWatcherAction ? (
            <button
              type="button"
              className={`content-panel-breadcrumb-watcher-button ${
                issuesWatcherAction.settingsActive
                  ? "content-panel-breadcrumb-watcher-button-active"
                  : ""
              }`}
              aria-label={
                issuesWatcherAction.watcherActive
                  ? issuesWatcherAction.autoAssignActive
                    ? "Issue watcher active, auto assign on"
                    : "Issue watcher active"
                  : "Issue settings"
              }
              aria-pressed={issuesWatcherAction.settingsActive}
              onClick={() => issuesWatcherAction.onToggle()}
            >
              <WatcherPollProgressRing
                pollIntervalMs={issuesWatcherAction.pollIntervalMs}
                animationKey={issuesWatcherAction.animationKey}
                active={issuesWatcherAction.watcherActive}
                autoAssignActive={issuesWatcherAction.autoAssignActive}
              />
            </button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
