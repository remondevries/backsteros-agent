import { useMemo } from "react";
import { LinearStatusIcon } from "../../chat/LinearStatusIcon";
import { useLinearProjectIssues } from "../../hooks/useLinearProjectIssues";
import { groupVariantFromStatusKey } from "../../lib/groupVariantFromStatusKey";
import { groupLinearIssuesByStatus } from "../../linear/groupLinearIssuesByStatus";
import { StatusGroupedList } from "../workspace-list/StatusGroupedList";
import { useCollapsibleGroups } from "../workspace-list/useCollapsibleGroups";
import { ProjectIssueRow } from "./ProjectIssueRow";

function openIssueUrl(url: string | undefined) {
  const target = url?.trim();
  if (!target) return;
  window.open(target, "_blank", "noopener,noreferrer");
}

export function ProjectIssuesPanel({
  projectId,
  enabled,
}: {
  projectId: string;
  enabled: boolean;
}) {
  const { issues, loading, error } = useLinearProjectIssues(projectId, enabled);
  const { collapsedGroups, toggleGroup } = useCollapsibleGroups();

  const groups = useMemo(() => {
    return groupLinearIssuesByStatus(issues).map((group) => ({
      key: group.status,
      title: group.status,
      count: group.issues.length,
      items: group.issues,
      variant: groupVariantFromStatusKey(group.status),
      icon: (
        <LinearStatusIcon
          status={group.status}
          stateType={group.stateType}
          title={group.status}
        />
      ),
    }));
  }, [issues]);

  if (loading && issues.length === 0) {
    return (
      <div className="workspace-status-list-scroll">
        <div className="workspace-status-list-loading">
          <p>Loading issues…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workspace-status-list-scroll">
        <div className="workspace-status-list-error" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="workspace-status-list-scroll">
        <div className="workspace-status-list-empty">
          <p>No issues in this project.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-status-list-scroll">
      <StatusGroupedList
        className="workspace-status-list workspace-status-list--issues"
        groups={groups}
        collapsedGroups={collapsedGroups}
        onToggleGroup={toggleGroup}
        idPrefix="project-issues-group"
        renderItem={(issue) => (
          <ProjectIssueRow
            key={issue.id}
            issue={issue}
            grouped
            onClick={() => openIssueUrl(issue.url)}
          />
        )}
      />
    </div>
  );
}
