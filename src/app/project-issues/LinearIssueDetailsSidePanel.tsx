import { useCallback } from "react";
import { useLinearIssueDetail } from "../../hooks/useLinearIssueDetail";
import { useLinearTeamLabels } from "../../hooks/useLinearTeamLabels";
import { linearAssigneeIdFromDropdownValue } from "../../lib/linearIssueDetailDropdowns";
import { ResizablePanel } from "../ResizablePanel";
import { LinearIssueActionBar } from "./LinearIssueActionBar";
import type { LinearSidebarTeamConfig } from "../sidebarNavConfig";
import {
  LinearIssueDetailsPanel,
  type InboxProjectMoveConfig,
  type LinearIssueDueDatePropertyLabels,
} from "./LinearIssueDetailsPanel";
import type { InboxIssueProjectSelection } from "./InboxIssueProjectPropertyDropdown";
import type { LinearIssueDetailUpdates } from "../../lib/api";

export const LINEAR_ISSUE_DETAILS_WIDTH_KEY = "backsteros.layout.linearIssueDetailsWidth";

export const LINEAR_LETTER_ISSUE_DETAILS_PANEL = {
  defaultWidth: 220,
  minWidth: 180,
  maxWidth: 360,
} as const;

export function LinearIssueDetailsSidePanel({
  issueId,
  labelTeamId = null,
  storageKey = LINEAR_ISSUE_DETAILS_WIDTH_KEY,
  ariaLabel = "Issue details",
  dueDatePropertyLabels,
  hideEstimateProperty = false,
  lettersLayout = false,
  inboxProjectMove,
  organizationProjectDisabled = false,
  onSyncDocumentOrganizationProject,
  workspaceTeamConfig = {},
}: {
  issueId: string;
  labelTeamId?: string | null;
  storageKey?: string;
  ariaLabel?: string;
  dueDatePropertyLabels?: LinearIssueDueDatePropertyLabels;
  hideEstimateProperty?: boolean;
  lettersLayout?: boolean;
  inboxProjectMove?: InboxProjectMoveConfig;
  organizationProjectDisabled?: boolean;
  onSyncDocumentOrganizationProject?: (updates: {
    teamId?: string;
    projectId?: string | null;
  }) => Promise<{ error: string | null }>;
  workspaceTeamConfig?: LinearSidebarTeamConfig;
}) {
  const { issue, loading, error, updating, updateIssue } = useLinearIssueDetail(issueId, true);
  const { labels: teamLabels } = useLinearTeamLabels(labelTeamId, Boolean(labelTeamId?.trim()));

  const handleStatusChange = useCallback(
    (stateId: string) => {
      void updateIssue({ stateId });
    },
    [updateIssue],
  );

  const handlePriorityChange = useCallback(
    (priority: string) => {
      const value = Number(priority);
      if (!Number.isFinite(value)) return;
      void updateIssue({ priority: Math.round(value) });
    },
    [updateIssue],
  );

  const handleEstimateChange = useCallback(
    (estimate: string) => {
      const value = Number(estimate);
      if (!Number.isFinite(value) || value <= 0) {
        void updateIssue({ estimate: null });
        return;
      }
      void updateIssue({ estimate: Math.round(value) });
    },
    [updateIssue],
  );

  const handleAssigneeChange = useCallback(
    (assigneeValue: string) => {
      void updateIssue({ assigneeId: linearAssigneeIdFromDropdownValue(assigneeValue) });
    },
    [updateIssue],
  );

  const handleDueDateChange = useCallback(
    (dueDate: string | null) => {
      void updateIssue({ dueDate });
    },
    [updateIssue],
  );

  const handleLabelAdd = useCallback(
    (labelId: string) => {
      if (!issue) return;
      const existingLabelIds = issue.labels
        .map((label) => label.id)
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0);
      const nextLabelIds = Array.from(new Set([...existingLabelIds, labelId]));
      void updateIssue({ labelIds: nextLabelIds });
    },
    [issue, updateIssue],
  );

  const handleOrganizationProjectChange = useCallback(
    ({ teamId, projectId }: InboxIssueProjectSelection) => {
      if (!issue) return;

      const currentTeamId = issue.teamId?.trim() ?? "";
      const currentProjectId = issue.projectId?.trim() ?? "";
      const nextTeamId = teamId.trim();
      const nextProjectId = projectId.trim();

      const updates: LinearIssueDetailUpdates = {};
      if (nextTeamId && nextTeamId !== currentTeamId) {
        updates.teamId = nextTeamId;
        updates.projectId = nextProjectId || null;
      } else if (nextProjectId !== currentProjectId) {
        updates.projectId = nextProjectId || null;
      } else {
        return;
      }

      void (async () => {
        const updateError = await updateIssue(updates);
        if (updateError) return;

        if (!onSyncDocumentOrganizationProject) return;

        const documentUpdates: { teamId?: string; projectId?: string | null } = {};
        if (updates.teamId) {
          documentUpdates.teamId = updates.teamId;
        }
        if ("projectId" in updates) {
          documentUpdates.projectId = updates.projectId ?? null;
        }
        if (Object.keys(documentUpdates).length === 0) return;

        await onSyncDocumentOrganizationProject(documentUpdates);
      })();
    },
    [issue, onSyncDocumentOrganizationProject, updateIssue],
  );

  return (
    <ResizablePanel
      side="right"
      className={[
        "app-resizable-panel-inset",
        "linear-issue-details-resizable",
        lettersLayout ? "linear-issue-details-resizable--letters" : null,
      ]
        .filter(Boolean)
        .join(" ")}
      storageKey={storageKey}
      defaultWidth={
        lettersLayout
          ? LINEAR_LETTER_ISSUE_DETAILS_PANEL.defaultWidth
          : 300
      }
      minWidth={
        lettersLayout ? LINEAR_LETTER_ISSUE_DETAILS_PANEL.minWidth : 300
      }
      maxWidth={
        lettersLayout ? LINEAR_LETTER_ISSUE_DETAILS_PANEL.maxWidth : 480
      }
      fitContent={lettersLayout}
      ariaLabel={ariaLabel}
    >
      <div className="linear-issue-details-shell">
        {issue ? <LinearIssueActionBar issue={issue} /> : null}
        <div className="linear-issue-details-scroll">
          {issue ? (
            <LinearIssueDetailsPanel
              issue={issue}
              availableLabelsOverride={labelTeamId?.trim() ? teamLabels : undefined}
              dueDatePropertyLabels={dueDatePropertyLabels}
              hideEstimateProperty={hideEstimateProperty}
              showOrganizationProjectDropdowns={lettersLayout && !inboxProjectMove}
              organizationProjectDisabled={
                organizationProjectDisabled || updating
              }
              inboxProjectMove={inboxProjectMove}
              workspaceTeamConfig={workspaceTeamConfig}
              onStatusChange={handleStatusChange}
              onPriorityChange={handlePriorityChange}
              onAssigneeChange={handleAssigneeChange}
              onEstimateChange={handleEstimateChange}
              onDueDateChange={handleDueDateChange}
              onLabelAdd={handleLabelAdd}
              onOrganizationProjectChange={handleOrganizationProjectChange}
            />
          ) : loading ? (
            <p className="linear-issue-details-empty">Loading issue…</p>
          ) : (
            <p className="linear-issue-details-empty" role="alert">
              {error ?? `Could not load ${issueId}.`}
            </p>
          )}
        </div>
      </div>
    </ResizablePanel>
  );
}
