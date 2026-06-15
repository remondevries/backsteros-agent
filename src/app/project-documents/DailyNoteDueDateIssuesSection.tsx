import { useMemo } from "react";
import type { LinearIssueEntity } from "../../chat/types";
import { LinearStatusIcon } from "../../chat/LinearStatusIcon";
import { LinearIcon } from "../../chat/LinearIcon";
import { useLinearIssuesByDueDates } from "../../hooks/useLinearIssuesByDueDates";
import { groupLinearIssuesByStatus } from "../../linear/groupLinearIssuesByStatus";
import { useContentListNavigationRegistration } from "../../lib/contentListNavigationReact";
import { ProjectIssueRow } from "../project-issues/ProjectIssueRow";

export function DailyNoteDueDateIssuesSection({
  dueDate,
  enabled,
  onOpenIssue,
  selectedIssueId,
}: {
  dueDate: string;
  enabled: boolean;
  onOpenIssue: (issue: LinearIssueEntity, mode?: "issue" | "terminal") => void;
  selectedIssueId: string | null;
}) {
  const dueDatesForIssues = useMemo(() => [dueDate], [dueDate]);
  const {
    issuesByDueDate,
    loading: dueDateIssuesLoading,
    error: dueDateIssuesError,
  } = useLinearIssuesByDueDates(dueDatesForIssues, enabled);
  const dueDateIssues = issuesByDueDate[dueDate] ?? [];
  const groupedDueDateIssues = useMemo(
    () => groupLinearIssuesByStatus(dueDateIssues),
    [dueDateIssues],
  );
  const showStatusGrouping = groupedDueDateIssues.length > 1;

  const dailyIssueListNavItems = useMemo(
    () =>
      groupedDueDateIssues.flatMap((group) =>
        group.issues.map((issue) => ({
          id: issue.id,
          select: () => onOpenIssue(issue),
        })),
      ),
    [groupedDueDateIssues, onOpenIssue],
  );

  useContentListNavigationRegistration({
    region: "main",
    enabled: enabled && !dueDateIssuesLoading && dailyIssueListNavItems.length > 0,
    priority: 8,
    items: dailyIssueListNavItems,
    selectedId: selectedIssueId,
  });

  if (!enabled) return null;

  return (
    <section className="vault-document-linear-issues">
      <p className="vault-document-linear-issues-title">
        <span className="vault-document-linear-issues-title-icon" aria-hidden="true">
          <LinearIcon size={14} />
        </span>
        <span>Linear</span>
      </p>
      {dueDateIssuesLoading ? (
        <p className="vault-document-linear-issues-status">Loading issues…</p>
      ) : null}
      {!dueDateIssuesLoading && dueDateIssuesError ? (
        <p className="vault-document-linear-issues-status vault-document-linear-issues-status-error">
          {dueDateIssuesError}
        </p>
      ) : null}
      {!dueDateIssuesLoading && !dueDateIssuesError ? (
        dueDateIssues.length > 0 ? (
          showStatusGrouping ? (
            <div className="vault-document-linear-issues-groups">
              {groupedDueDateIssues.map((group) => (
                <section key={group.status} className="vault-document-linear-issues-group">
                  <p className="vault-document-linear-issues-group-header">
                    <span className="vault-document-linear-issues-group-icon" aria-hidden="true">
                      <LinearStatusIcon
                        status={group.status}
                        stateType={group.stateType}
                        title={group.status}
                      />
                    </span>
                    <span className="vault-document-linear-issues-group-title">{group.status}</span>
                    <span className="vault-document-linear-issues-group-count">{group.issues.length}</span>
                  </p>
                  <ul className="workspace-status-list vault-document-linear-issues-list">
                    {group.issues.map((issue) => (
                      <ProjectIssueRow
                        key={issue.id}
                        issue={issue}
                        grouped={false}
                        leadingIcon="status"
                        showPrimaryLabel={false}
                        showProjectLabel
                        showDueMeta={false}
                        showEstimateMeta={false}
                        onClick={() => onOpenIssue(issue)}
                        onTerminalIndicatorClick={() => onOpenIssue(issue, "terminal")}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <ul className="workspace-status-list vault-document-linear-issues-list">
              {dueDateIssues.map((issue) => (
                <ProjectIssueRow
                  key={issue.id}
                  issue={issue}
                  grouped={false}
                  leadingIcon="status"
                  showPrimaryLabel={false}
                  showProjectLabel
                  showDueMeta={false}
                  showEstimateMeta={false}
                  onClick={() => onOpenIssue(issue)}
                  onTerminalIndicatorClick={() => onOpenIssue(issue, "terminal")}
                />
              ))}
            </ul>
          )
        ) : (
          <p className="vault-document-linear-issues-status">No Linear issues due on this date.</p>
        )
      ) : null}
    </section>
  );
}
