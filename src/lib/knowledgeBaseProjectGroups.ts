import { compareDocumentsNewestFirst, type ProjectDocumentEntity } from "./documentStatusGroups";
import { isLinearMeetingDocumentIcon } from "./linearDocumentIcons";

export const KNOWLEDGE_BASE_NO_PROJECT_KEY = "__no_project__";

export type KnowledgeBaseProjectGroup = {
  key: string;
  label: string;
  entries: ProjectDocumentEntity[];
};

function matchesSearchQuery(value: string, query: string): boolean {
  if (!query) return true;
  return value.toLocaleLowerCase().includes(query);
}

/** Meeting notes use Linear's Calendar icon and belong in Meetings, not Knowledge Base. */
export function selectKnowledgeBaseDocuments(
  documents: ProjectDocumentEntity[],
): ProjectDocumentEntity[] {
  return documents.filter((document) => !isLinearMeetingDocumentIcon(document.icon));
}

export function filterKnowledgeBaseDocuments(
  documents: ProjectDocumentEntity[],
  query: string,
): ProjectDocumentEntity[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return documents;

  return documents.filter(
    (document) =>
      matchesSearchQuery(document.title, normalizedQuery) ||
      matchesSearchQuery(document.projectName, normalizedQuery),
  );
}

export function groupProjectDocumentsByProject(
  documents: ProjectDocumentEntity[],
): KnowledgeBaseProjectGroup[] {
  const byProject = new Map<string, { label: string; entries: ProjectDocumentEntity[] }>();

  for (const document of documents) {
    const projectId = document.projectId?.trim() || KNOWLEDGE_BASE_NO_PROJECT_KEY;
    const label =
      projectId === KNOWLEDGE_BASE_NO_PROJECT_KEY
        ? "No project"
        : document.projectName?.trim() || "Untitled Project";

    const existing = byProject.get(projectId);
    if (existing) {
      existing.entries.push(document);
      continue;
    }

    byProject.set(projectId, { label, entries: [document] });
  }

  return [...byProject.entries()]
    .map(([key, { label, entries }]) => ({
      key,
      label,
      entries: [...entries].sort(compareDocumentsNewestFirst),
    }))
    .sort((left, right) => {
      if (left.key === KNOWLEDGE_BASE_NO_PROJECT_KEY) return 1;
      if (right.key === KNOWLEDGE_BASE_NO_PROJECT_KEY) return -1;
      return left.label.localeCompare(right.label);
    });
}

export function buildKnowledgeBaseProjectFolders(
  documents: ProjectDocumentEntity[],
  teamProjects: Array<{ id: string; name: string }>,
): KnowledgeBaseProjectGroup[] {
  const documentGroups = groupProjectDocumentsByProject(documents);
  const documentByKey = new Map(documentGroups.map((group) => [group.key, group]));
  const folders: KnowledgeBaseProjectGroup[] = [];

  for (const project of teamProjects) {
    const existing = documentByKey.get(project.id);
    folders.push(
      existing ?? {
        key: project.id,
        label: project.name,
        entries: [],
      },
    );
    documentByKey.delete(project.id);
  }

  for (const group of documentGroups) {
    if (group.key === KNOWLEDGE_BASE_NO_PROJECT_KEY) {
      if (group.entries.length > 0) {
        folders.push(group);
      }
      continue;
    }

    if (!folders.some((folder) => folder.key === group.key)) {
      folders.push(group);
    }
  }

  return folders.sort((left, right) => {
    if (left.key === KNOWLEDGE_BASE_NO_PROJECT_KEY) return 1;
    if (right.key === KNOWLEDGE_BASE_NO_PROJECT_KEY) return -1;
    return left.label.localeCompare(right.label);
  });
}
