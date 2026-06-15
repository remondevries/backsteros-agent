import type { LinearIssueEntity } from "../chat/types";
import type { ProjectDocumentEntity } from "./documentStatusGroups";
import { compareDocumentsNewestFirst } from "./documentStatusGroups";
import { resolveDocumentLinkedIssue } from "./resolveDocumentLinkedIssue";
import type { LinearWorkflowStateForIcon } from "./linearStatusIcon";
import {
  groupLinearIssuesByWorkflow,
} from "../linear/groupLinearIssuesByStatus";

export const UNLINKED_ISSUE_DOCUMENT_GROUP_KEY = "__unlinked__";
export const UNKNOWN_ISSUE_DOCUMENT_GROUP_KEY = "__unknown_issue__";

export interface LinearDocumentStatusGroup {
  key: string;
  status: string;
  stateId?: string | null;
  stateType?: string;
  statusColor?: string;
  documents: ProjectDocumentEntity[];
}

function buildIssueByIdentifier(issues: LinearIssueEntity[]): Map<string, LinearIssueEntity> {
  const map = new Map<string, LinearIssueEntity>();
  for (const issue of issues) {
    const identifier = issue.identifier?.trim().toUpperCase();
    if (identifier) {
      map.set(identifier, issue);
    }
  }
  return map;
}

function bucketDocumentsByLinkedIssue(
  documents: ProjectDocumentEntity[],
  issueByIdentifier: Map<string, LinearIssueEntity>,
): {
  documentsByIssueId: Map<string, ProjectDocumentEntity[]>;
  unlinked: ProjectDocumentEntity[];
  unknownLink: ProjectDocumentEntity[];
} {
  const documentsByIssueId = new Map<string, ProjectDocumentEntity[]>();
  const unlinked: ProjectDocumentEntity[] = [];
  const unknownLink: ProjectDocumentEntity[] = [];

  for (const document of documents) {
    const linked = resolveDocumentLinkedIssue(document);
    if (linked.issueId) {
      const list = documentsByIssueId.get(linked.issueId) ?? [];
      list.push(document);
      documentsByIssueId.set(linked.issueId, list);
      continue;
    }

    const issueIdentifier = linked.issueIdentifier;
    if (!issueIdentifier) {
      unlinked.push(document);
      continue;
    }

    const issue = issueByIdentifier.get(issueIdentifier);
    if (!issue) {
      unknownLink.push(document);
      continue;
    }

    const list = documentsByIssueId.get(issue.id) ?? [];
    list.push(document);
    documentsByIssueId.set(issue.id, list);
  }

  return { documentsByIssueId, unlinked, unknownLink };
}

/** Groups letter documents under team workflow states based on linked issue (API link or legacy title prefix). */
export function groupLinearDocumentsByLinkedIssueStatus(
  documents: ProjectDocumentEntity[],
  issues: LinearIssueEntity[],
  workflowStates: LinearWorkflowStateForIcon[],
): LinearDocumentStatusGroup[] {
  const issueByIdentifier = buildIssueByIdentifier(issues);
  const { documentsByIssueId, unlinked, unknownLink } = bucketDocumentsByLinkedIssue(
    documents,
    issueByIdentifier,
  );

  const issuesForGrouping: LinearIssueEntity[] = [];
  for (const [issueId, linkedDocuments] of documentsByIssueId) {
    if (linkedDocuments.length === 0) continue;
    const issue = issues.find((item) => item.id === issueId);
    if (issue) {
      issuesForGrouping.push(issue);
    }
  }

  const issueStatusGroups = groupLinearIssuesByWorkflow(issuesForGrouping, workflowStates);
  const groups: LinearDocumentStatusGroup[] = [];

  for (const statusGroup of issueStatusGroups) {
    const linkedDocuments: ProjectDocumentEntity[] = [];
    for (const issue of statusGroup.issues) {
      const docs = documentsByIssueId.get(issue.id);
      if (docs?.length) {
        linkedDocuments.push(...docs);
      }
    }
    if (linkedDocuments.length === 0) continue;

    groups.push({
      key: statusGroup.stateId ?? statusGroup.status,
      status: statusGroup.status,
      stateId: statusGroup.stateId,
      stateType: statusGroup.stateType,
      statusColor: statusGroup.statusColor,
      documents: [...linkedDocuments].sort(compareDocumentsNewestFirst),
    });
  }

  if (unlinked.length > 0) {
    groups.push({
      key: UNLINKED_ISSUE_DOCUMENT_GROUP_KEY,
      status: "No linked issue",
      documents: [...unlinked].sort(compareDocumentsNewestFirst),
    });
  }

  if (unknownLink.length > 0) {
    groups.push({
      key: UNKNOWN_ISSUE_DOCUMENT_GROUP_KEY,
      status: "Issue not found",
      documents: [...unknownLink].sort(compareDocumentsNewestFirst),
    });
  }

  return groups;
}
