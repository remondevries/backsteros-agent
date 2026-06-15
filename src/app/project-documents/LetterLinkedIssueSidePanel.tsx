import { LETTER_RECEIVED_DATE_PROPERTY_LABELS } from "../../chat/letter";
import type { LinearIssueEntity } from "../../chat/types";
import { ResizablePanel } from "../ResizablePanel";
import type { LinearSidebarTeamConfig } from "../sidebarNavConfig";
import {
  LINEAR_LETTER_ISSUE_DETAILS_PANEL,
  LinearIssueDetailsSidePanel,
} from "../project-issues/LinearIssueDetailsSidePanel";
import { LinearDocumentLinkedIssueDropdown } from "./LinearDocumentLinkedIssueDropdown";

const LETTER_LINKED_ISSUE_DETAILS_WIDTH_KEY = "backsteros.layout.letterLinkedIssueDetailsWidth";
const LETTER_COMPOSE_ISSUE_DETAILS_WIDTH_KEY = "backsteros.layout.letterComposeIssueDetailsWidth";

export { LETTER_COMPOSE_ISSUE_DETAILS_WIDTH_KEY };

function LetterIssueLinkPanel({
  issueIdentifier,
  disabled,
  onLinkIssue,
  onClearIssue,
}: {
  issueIdentifier: string | null;
  disabled?: boolean;
  onLinkIssue: (issue: LinearIssueEntity) => void;
  onClearIssue: () => void;
}) {
  return (
    <ResizablePanel
      side="right"
      className="app-resizable-panel-inset linear-issue-details-resizable linear-issue-details-resizable--letters"
      storageKey={LETTER_LINKED_ISSUE_DETAILS_WIDTH_KEY}
      defaultWidth={LINEAR_LETTER_ISSUE_DETAILS_PANEL.defaultWidth}
      minWidth={LINEAR_LETTER_ISSUE_DETAILS_PANEL.minWidth}
      maxWidth={LINEAR_LETTER_ISSUE_DETAILS_PANEL.maxWidth}
      fitContent
      ariaLabel="Linked issue details"
    >
      <div className="linear-issue-details-shell">
        <div className="linear-issue-details-scroll">
          <div className="linear-issue-details-panel">
            <section className="linear-issue-details-section">
              <header className="linear-issue-details-section-header">
                <span className="linear-issue-details-section-heading">
                  <span className="linear-issue-details-section-chevron" aria-hidden="true">
                    ▾
                  </span>
                  <h3 className="linear-issue-details-section-title">Linked issue</h3>
                </span>
              </header>
              <div className="linear-issue-details-section-body">
                <LinearDocumentLinkedIssueDropdown
                  issueIdentifier={issueIdentifier}
                  disabled={disabled}
                  onLinkIssue={onLinkIssue}
                  onClearIssue={onClearIssue}
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </ResizablePanel>
  );
}

export function LetterLinkedIssueSidePanel({
  issueIdentifier,
  labelTeamId = null,
  disabled = false,
  onLinkIssue,
  onClearIssue,
  onSyncDocumentOrganizationProject,
  workspaceTeamConfig = {},
}: {
  issueIdentifier: string | null;
  labelTeamId?: string | null;
  disabled?: boolean;
  onLinkIssue: (issue: LinearIssueEntity) => void;
  onClearIssue: () => void;
  onSyncDocumentOrganizationProject?: (updates: {
    teamId?: string;
    projectId?: string | null;
  }) => Promise<{ error: string | null }>;
  workspaceTeamConfig?: LinearSidebarTeamConfig;
}) {
  if (issueIdentifier) {
    return (
      <LinearIssueDetailsSidePanel
        issueId={issueIdentifier}
        labelTeamId={labelTeamId}
        storageKey={LETTER_LINKED_ISSUE_DETAILS_WIDTH_KEY}
        ariaLabel="Linked issue details"
        dueDatePropertyLabels={LETTER_RECEIVED_DATE_PROPERTY_LABELS}
        hideEstimateProperty
        lettersLayout
        organizationProjectDisabled={disabled}
        workspaceTeamConfig={workspaceTeamConfig}
        onSyncDocumentOrganizationProject={onSyncDocumentOrganizationProject}
      />
    );
  }

  return (
    <LetterIssueLinkPanel
      issueIdentifier={issueIdentifier}
      disabled={disabled}
      onLinkIssue={onLinkIssue}
      onClearIssue={onClearIssue}
    />
  );
}
