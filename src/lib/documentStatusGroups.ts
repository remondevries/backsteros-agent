import type { GroupVariant } from "./groupVariantFromStatusKey";

export const DOCUMENT_STATUS_ORDER = [
  "Inbox",
  "In Progress",
  "On Hold",
  "Archived",
] as const;

export type DocumentStatusGroup = (typeof DOCUMENT_STATUS_ORDER)[number];

export interface ProjectDocumentEntity {
  id: string;
  linearDocumentId: string;
  projectId: string;
  projectName: string;
  title: string;
  status: string;
  statusGroup: DocumentStatusGroup;
  organization: string;
  owner: string;
  category: string;
  date: string | null;
  updatedAt: string;
}

export interface DocumentStatusGroupBucket {
  status: DocumentStatusGroup;
  documents: ProjectDocumentEntity[];
}

/** Normalize note frontmatter status to a document workflow group. */
export function getDocumentStatusGroup(status: unknown): DocumentStatusGroup {
  const value = typeof status === "string" ? status.trim() : "";
  if (!value) return "Inbox";

  const lower = value.toLowerCase();
  if (lower === "concept" || lower === "triage") return "Inbox";
  if (lower === "archive" || lower === "archived") return "Archived";

  for (const option of DOCUMENT_STATUS_ORDER) {
    if (option.toLowerCase() === lower) return option;
  }

  return "Inbox";
}

export function documentStatusGroupVariant(status: DocumentStatusGroup): GroupVariant {
  switch (status) {
    case "Inbox":
      return "backlog";
    case "In Progress":
      return "development";
    case "On Hold":
      return "onHold";
    case "Archived":
      return "completed";
  }
}

export function groupDocumentsByStatus(
  documents: ProjectDocumentEntity[],
): DocumentStatusGroupBucket[] {
  const byStatus = new Map<DocumentStatusGroup, ProjectDocumentEntity[]>();

  for (const document of documents) {
    const group = document.statusGroup;
    const existing = byStatus.get(group);
    if (existing) {
      existing.push(document);
    } else {
      byStatus.set(group, [document]);
    }
  }

  return DOCUMENT_STATUS_ORDER.map((status) => ({
    status,
    documents: byStatus.get(status) ?? [],
  })).filter((group) => group.documents.length > 0);
}

function documentTimestamp(document: ProjectDocumentEntity): number {
  const updatedAt = document.updatedAt?.trim() ?? "";
  if (updatedAt) {
    const parsed = new Date(updatedAt);
    if (Number.isFinite(parsed.getTime())) return parsed.getTime();
  }

  const date = document.date?.trim().slice(0, 10) ?? "";
  if (date) {
    const parsed = new Date(date);
    if (Number.isFinite(parsed.getTime())) return parsed.getTime();
  }
  return 0;
}

export function compareDocumentsNewestFirst(
  left: ProjectDocumentEntity,
  right: ProjectDocumentEntity,
): number {
  return documentTimestamp(right) - documentTimestamp(left) || right.title.localeCompare(left.title);
}
