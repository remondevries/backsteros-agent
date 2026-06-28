import type { ContentPanelBreadcrumbSegment } from "./contentPanelNavigation";
import { useContentPanelChrome } from "./contentPanelChromeContext";
import { ContentPanelBreadcrumb } from "./ContentPanelBreadcrumb";
import { ContentPanelBreadcrumbOverflowMenu, DocumentBreadcrumbMenu } from "./DocumentBreadcrumbMenu";
import { WatcherPollProgressRing } from "./project-issues/WatcherPollProgressRing";
import { LinearIssueViewModeToggle } from "./project-issues/LinearIssueViewModeToggle";

export function ContentPanelBreadcrumbBar({
  segments,
}: {
  segments: ContentPanelBreadcrumbSegment[];
}) {
  const {
    issuesWatcherAction,
    issueViewModeAction,
    documentDeleteAction,
    issueDeleteAction,
    projectsBrowseSearchAction,
  } = useContentPanelChrome();

  const showActions =
    issuesWatcherAction ||
    issueViewModeAction ||
    documentDeleteAction ||
    issueDeleteAction ||
    projectsBrowseSearchAction;

  return (
    <header className="content-panel-breadcrumb-bar">
      <ContentPanelBreadcrumb segments={segments} />
      {showActions ? (
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
          {documentDeleteAction ? (
            <DocumentBreadcrumbMenu action={documentDeleteAction} />
          ) : null}
          {issueDeleteAction ? (
            <ContentPanelBreadcrumbOverflowMenu action={issueDeleteAction} menuLabel="Issue options" />
          ) : null}
          {projectsBrowseSearchAction ? (
            <label className="content-panel-breadcrumb-search-field">
              <span className="sidebar-explorer-search-label">
                {projectsBrowseSearchAction.ariaLabel}
              </span>
              <input
                type="search"
                className="content-panel-breadcrumb-search-input"
                value={projectsBrowseSearchAction.value}
                onChange={(event) => projectsBrowseSearchAction.onChange(event.target.value)}
                placeholder={projectsBrowseSearchAction.placeholder}
                aria-label={projectsBrowseSearchAction.ariaLabel}
                disabled={projectsBrowseSearchAction.disabled}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
