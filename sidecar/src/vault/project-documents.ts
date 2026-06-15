import { isDailyJournalDocumentTitle } from "../daily-note.ts";
import { LINEAR_MEETING_DOCUMENT_ICON } from "../linear/linear-document-icons.ts";
import { linearGraphqlRequest } from "../linear/graphql.ts";
import { meetingDocumentDateFromTitle } from "../meeting-document-title.ts";
import {
  createLinearApiDocument,
  createLinearApiTeamDocument,
  deleteLinearApiDocument,
  fetchLinearApiDocumentById,
  fetchLinearApiMeetingDocuments,
  fetchLinearApiProjectDocuments,
  fetchLinearApiProjectMeetingDocuments,
  fetchLinearApiTeamDocuments,
  fetchLinearApiWorkspaceDocuments,
  assignLinearApiDocumentProject,
  enrichLinearApiDocumentsTeamFromProjects,
  updateLinearApiDocument,
  type LinearApiDocument,
} from "../linear/project-documents-api.ts";

export type ProjectDocumentRecord = {
  id: string;
  linearDocumentId: string;
  projectId: string;
  projectName: string;
  title: string;
  icon: string | null;
  status: string;
  statusGroup: "Inbox" | "In Progress" | "On Hold" | "Archived";
  organization: string;
  owner: string;
  category: string;
  date: string | null;
  updatedAt: string;
  linkedIssueId?: string;
  linkedIssueIdentifier?: string;
};

const DOCUMENT_STATUS_ORDER = ["Inbox", "In Progress", "On Hold", "Archived"] as const;

function compareDocumentsNewestFirst(left: ProjectDocumentRecord, right: ProjectDocumentRecord): number {
  const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
  const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
  const safeLeft = Number.isFinite(leftTime) ? leftTime : 0;
  const safeRight = Number.isFinite(rightTime) ? rightTime : 0;
  return safeRight - safeLeft || right.title.localeCompare(left.title);
}

function compareDailyJournalDocumentsNewestFirst(
  left: ProjectDocumentRecord,
  right: ProjectDocumentRecord,
): number {
  const leftDate = isDailyJournalDocumentTitle(left.title) ? left.title.trim() : null;
  const rightDate = isDailyJournalDocumentTitle(right.title) ? right.title.trim() : null;
  if (leftDate && rightDate) {
    return rightDate.localeCompare(leftDate);
  }
  if (leftDate) return -1;
  if (rightDate) return 1;
  return compareDocumentsNewestFirst(left, right);
}

async function resolveProjectContext(projectId: string): Promise<{
  projectName: string;
}> {
  const data = await linearGraphqlRequest<{
    project?: { name?: string | null } | null;
  }>(
    `
      query BacksterProjectDocumentsContext($id: String!) {
        project(id: $id) {
          name
        }
      }
    `,
    { id: projectId },
  );

  return { projectName: (data.project?.name ?? "").trim() || "Untitled Project" };
}

function mapLinearDocumentToRecord(
  document: LinearApiDocument,
  projectId: string,
  projectName: string,
): ProjectDocumentRecord {
  const updatedAt = document.updatedAt || document.createdAt || "";
  const journalDate = isDailyJournalDocumentTitle(document.title) ? document.title.trim() : null;
  const titleDate = meetingDocumentDateFromTitle(document.title);
  return {
    id: document.id,
    linearDocumentId: document.id,
    projectId,
    projectName,
    title: document.title,
    icon: document.icon ?? null,
    status: "Inbox",
    statusGroup: "Inbox",
    organization: document.teamName?.trim() || "",
    owner: "",
    category: "Document",
    date: journalDate ?? titleDate ?? (updatedAt ? updatedAt.slice(0, 10) : null),
    updatedAt,
    linkedIssueId: document.linkedIssueId,
    linkedIssueIdentifier: document.linkedIssueIdentifier,
  };
}

export async function fetchLinearProjectDocuments(
  projectId: string,
): Promise<ProjectDocumentRecord[]> {
  const id = projectId.trim();
  if (!id) return [];

  const [{ projectName }, linearDocuments] = await Promise.all([
    resolveProjectContext(id),
    fetchLinearApiProjectDocuments(id),
  ]);

  return linearDocuments
    .map((document) => mapLinearDocumentToRecord(document, id, projectName))
    .sort(compareDocumentsNewestFirst);
}

export async function fetchLinearTeamDocuments(teamId: string): Promise<ProjectDocumentRecord[]> {
  const id = teamId.trim();
  if (!id) return [];

  const linearDocuments = await fetchLinearApiTeamDocuments(id);
  return linearDocuments
    .map((document) =>
      mapLinearDocumentToRecord(
        document,
        document.projectId ?? "",
        document.projectName ?? "Untitled Project",
      ),
    )
    .sort(compareDailyJournalDocumentsNewestFirst);
}

export async function fetchLinearMeetingDocuments(): Promise<ProjectDocumentRecord[]> {
  const linearDocuments = await enrichLinearApiDocumentsTeamFromProjects(
    await fetchLinearApiMeetingDocuments(),
  );
  return linearDocuments
    .map((document) =>
      mapLinearDocumentToRecord(
        document,
        document.projectId ?? "",
        document.projectName ?? "Untitled Project",
      ),
    )
    .sort(compareDocumentsNewestFirst);
}

export async function fetchLinearProjectMeetingDocuments(
  projectId: string,
): Promise<ProjectDocumentRecord[]> {
  const id = projectId.trim();
  if (!id) return [];

  const [{ projectName }, linearDocuments] = await Promise.all([
    resolveProjectContext(id),
    fetchLinearApiProjectMeetingDocuments(id),
  ]);

  return linearDocuments
    .map((document) => mapLinearDocumentToRecord(document, id, projectName))
    .sort(compareDocumentsNewestFirst);
}

export async function fetchLinearWorkspaceDocuments(): Promise<ProjectDocumentRecord[]> {
  const linearDocuments = await fetchLinearApiWorkspaceDocuments();
  return linearDocuments
    .map((document) =>
      mapLinearDocumentToRecord(
        document,
        document.projectId ?? "",
        document.projectName ?? "Untitled Project",
      ),
    )
    .sort(compareDocumentsNewestFirst);
}

/** @deprecated Use fetchLinearMeetingDocuments */
export const fetchLinearCalendarDocuments = fetchLinearMeetingDocuments;

export async function createProjectDocument(projectId: string): Promise<ProjectDocumentRecord> {
  const id = projectId.trim();
  if (!id) {
    throw new Error("projectId is required");
  }

  const { projectName } = await resolveProjectContext(id);
  const linearDocument = await createLinearApiDocument(id, "Untitled note", "");
  return mapLinearDocumentToRecord(linearDocument, id, projectName);
}

export async function createProjectMeetingDocument(
  projectId: string,
): Promise<ProjectDocumentRecord> {
  const id = projectId.trim();
  if (!id) {
    throw new Error("projectId is required");
  }

  const { projectName } = await resolveProjectContext(id);
  const today = new Date().toISOString().slice(0, 10);
  const title = `${today} - Untitled`;
  const linearDocument = await createLinearApiDocument(id, title, "");
  const withMeetingIcon = await updateLinearApiDocument(linearDocument.id, {
    icon: LINEAR_MEETING_DOCUMENT_ICON,
  });
  return mapLinearDocumentToRecord(withMeetingIcon, id, projectName);
}

export async function createTeamDocument(
  teamId: string,
  options?: { title?: string; content?: string; issueId?: string },
): Promise<ProjectDocumentRecord> {
  const id = teamId.trim();
  if (!id) {
    throw new Error("teamId is required");
  }

  const title = options?.title?.trim() || "Untitled note";
  const content = options?.content ?? "";
  const linearDocument = await createLinearApiTeamDocument(id, title, content, {
    issueId: options?.issueId,
  });
  return mapLinearDocumentToRecord(
    linearDocument,
    linearDocument.projectId ?? "",
    linearDocument.projectName ?? "Untitled Project",
  );
}

export async function createTeamMeetingDocument(teamId: string): Promise<ProjectDocumentRecord> {
  const id = teamId.trim();
  if (!id) {
    throw new Error("teamId is required");
  }

  const today = new Date().toISOString().slice(0, 10);
  const title = `${today} - Untitled`;
  const linearDocument = await createLinearApiTeamDocument(id, title, "");
  const withMeetingIcon = await updateLinearApiDocument(linearDocument.id, {
    icon: LINEAR_MEETING_DOCUMENT_ICON,
  });
  return mapLinearDocumentToRecord(
    withMeetingIcon,
    withMeetingIcon.projectId ?? "",
    withMeetingIcon.projectName ?? "Untitled Project",
  );
}

export async function fetchLinearDocument(
  documentId: string,
): Promise<LinearApiDocument | null> {
  return fetchLinearApiDocumentById(documentId);
}

export async function updateLinearDocument(
  documentId: string,
  updates: {
    title?: string;
    content?: string;
    projectId?: string | null;
    teamId?: string;
    issueId?: string | null;
  },
): Promise<LinearApiDocument> {
  if (updates.title !== undefined) {
    const existing = await fetchLinearApiDocumentById(documentId);
    if (existing && isDailyJournalDocumentTitle(existing.title)) {
      const { title: _ignoredTitle, ...rest } = updates;
      updates = rest;
    }
  }

  const teamId = updates.teamId?.trim();

  if (updates.projectId !== undefined) {
    const raw = updates.projectId;
    if (typeof raw === "string" && raw.trim()) {
      return assignLinearApiDocumentProject(documentId, raw.trim());
    }
    if (teamId) {
      return updateLinearApiDocument(documentId, { teamId, projectId: null });
    }
    return updateLinearApiDocument(documentId, { projectId: null });
  }

  if (teamId) {
    return updateLinearApiDocument(documentId, { teamId });
  }

  return updateLinearApiDocument(documentId, {
    ...(updates.title !== undefined ? { title: updates.title } : {}),
    ...(updates.content !== undefined ? { content: updates.content } : {}),
    ...(updates.issueId !== undefined ? { issueId: updates.issueId } : {}),
  });
}

export async function assignLinearDocumentProject(
  documentId: string,
  projectId: string,
): Promise<LinearApiDocument> {
  return assignLinearApiDocumentProject(documentId, projectId);
}

export async function deleteLinearDocument(documentId: string): Promise<void> {
  const existing = await fetchLinearApiDocumentById(documentId);
  if (!existing) {
    throw new Error("Document not found");
  }
  if (isDailyJournalDocumentTitle(existing.title)) {
    throw new Error("Daily notes cannot be deleted");
  }
  await deleteLinearApiDocument(documentId);
}
