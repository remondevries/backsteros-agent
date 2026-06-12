import { linearGraphqlRequest } from "../linear/graphql.ts";
import {
  createLinearApiDocument,
  deleteLinearApiDocument,
  fetchLinearApiDocumentById,
  fetchLinearApiProjectDocuments,
  fetchLinearApiTeamDocuments,
  updateLinearApiDocument,
  type LinearApiDocument,
} from "../linear/project-documents-api.ts";

export type ProjectDocumentRecord = {
  id: string;
  linearDocumentId: string;
  projectId: string;
  projectName: string;
  title: string;
  status: string;
  statusGroup: "Inbox" | "In Progress" | "On Hold" | "Archived";
  organization: string;
  owner: string;
  category: string;
  date: string | null;
  updatedAt: string;
};

const DOCUMENT_STATUS_ORDER = ["Inbox", "In Progress", "On Hold", "Archived"] as const;

function compareDocumentsNewestFirst(left: ProjectDocumentRecord, right: ProjectDocumentRecord): number {
  const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
  const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
  const safeLeft = Number.isFinite(leftTime) ? leftTime : 0;
  const safeRight = Number.isFinite(rightTime) ? rightTime : 0;
  return safeRight - safeLeft || right.title.localeCompare(left.title);
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
  return {
    id: document.id,
    linearDocumentId: document.id,
    projectId,
    projectName,
    title: document.title,
    status: "Inbox",
    statusGroup: "Inbox",
    organization: projectName,
    owner: "",
    category: "Document",
    date: updatedAt ? updatedAt.slice(0, 10) : null,
    updatedAt,
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
    .filter((record) => record.projectId)
    .sort(compareDocumentsNewestFirst);
}

export async function createProjectDocument(projectId: string): Promise<ProjectDocumentRecord> {
  const id = projectId.trim();
  if (!id) {
    throw new Error("projectId is required");
  }

  const { projectName } = await resolveProjectContext(id);
  const linearDocument = await createLinearApiDocument(id, "Untitled note", "");
  return mapLinearDocumentToRecord(linearDocument, id, projectName);
}

export async function fetchLinearDocument(
  documentId: string,
): Promise<LinearApiDocument | null> {
  return fetchLinearApiDocumentById(documentId);
}

export async function updateLinearDocument(
  documentId: string,
  updates: { title?: string; content?: string },
): Promise<LinearApiDocument> {
  return updateLinearApiDocument(documentId, updates);
}

export async function deleteLinearDocument(documentId: string): Promise<void> {
  await deleteLinearApiDocument(documentId);
}
