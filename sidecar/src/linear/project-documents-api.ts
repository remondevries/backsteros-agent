import {
  linearDocumentIconMatches,
  LINEAR_MEETING_DOCUMENT_ICON,
  normalizeLinearDocumentIcon,
} from "./linear-document-icons.ts";
import { fetchLinearProjectContext } from "./project-context.ts";
import { linearGraphqlRequest } from "./graphql.ts";

export type LinearApiDocument = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  url?: string;
  icon?: string;
  teamId?: string;
  teamName?: string;
  projectId?: string;
  projectName?: string;
  linkedIssueId?: string;
  linkedIssueIdentifier?: string;
};

type GraphqlDocumentNode = {
  id?: string | null;
  title?: string | null;
  content?: string | null;
  url?: string | null;
  icon?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  trashed?: boolean | null;
  project?: { id?: string | null; name?: string | null } | null;
  team?: { id?: string | null; name?: string | null } | null;
  issue?: { id?: string | null; identifier?: string | null } | null;
};

const DOCUMENT_FIELDS = `
  id
  title
  content
  url
  icon
  createdAt
  updatedAt
  trashed
  issue {
    id
    identifier
  }
`;

const PROJECT_DOCUMENTS_QUERY = `
  query BacksterProjectLinearDocuments($projectId: String!) {
    project(id: $projectId) {
      documents(first: 100, includeArchived: false) {
        nodes {
          ${DOCUMENT_FIELDS}
        }
      }
    }
  }
`;

const DOCUMENT_BY_ID_QUERY = `
  query BacksterLinearDocument($id: String!) {
    document(id: $id) {
      ${DOCUMENT_FIELDS}
      project {
        id
        name
      }
      team {
        id
        name
      }
    }
  }
`;

const TEAM_DOCUMENTS_QUERY = `
  query BacksterTeamDocumentsFiltered($teamId: ID!, $after: String, $first: Int!) {
    documents(
      filter: {
        or: [
          { team: { id: { eq: $teamId } } }
          { project: { accessibleTeams: { some: { id: { eq: $teamId } } } } }
        ]
      }
      first: $first
      after: $after
      includeArchived: false
      orderBy: updatedAt
    ) {
      nodes {
        ${DOCUMENT_FIELDS}
        project {
          id
          name
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const DOCUMENT_CREATE_MUTATION = `
  mutation BacksterDocumentCreate($input: DocumentCreateInput!) {
    documentCreate(input: $input) {
      success
      document {
        id
        title
        content
        url
        createdAt
        updatedAt
        issue {
          id
          identifier
        }
      }
    }
  }
`;

const DOCUMENT_UPDATE_MUTATION = `
  mutation BacksterDocumentUpdate($id: String!, $input: DocumentUpdateInput!) {
    documentUpdate(id: $id, input: $input) {
      success
      document {
        id
        title
        content
        icon
        updatedAt
        issue {
          id
          identifier
        }
        project {
          id
          name
        }
        team {
          id
          name
        }
      }
    }
  }
`;

const DOCUMENT_DELETE_MUTATION = `
  mutation BacksterDocumentDelete($id: String!) {
    documentDelete(id: $id) {
      success
    }
  }
`;

function normalizeDocument(
  node: GraphqlDocumentNode,
  project?: { id?: string; name?: string },
): LinearApiDocument | null {
  const id = node.id?.trim();
  if (!id || node.trashed) return null;

  const projectId = project?.id?.trim() || node.project?.id?.trim() || undefined;
  const projectName = project?.name?.trim() || node.project?.name?.trim() || undefined;
  const teamId = node.team?.id?.trim() || undefined;
  const teamName = node.team?.name?.trim() || undefined;

  const icon = normalizeLinearDocumentIcon(node.icon);

  const linkedIssueId = node.issue?.id?.trim() || undefined;
  const linkedIssueIdentifier = node.issue?.identifier?.trim() || undefined;

  return {
    id,
    title: (node.title ?? "Untitled").trim() || "Untitled",
    content: typeof node.content === "string" ? node.content : "",
    url: (node.url ?? "").trim() || undefined,
    createdAt: (node.createdAt ?? "").trim(),
    updatedAt: (node.updatedAt ?? "").trim(),
    icon: icon || undefined,
    teamId,
    teamName,
    projectId,
    projectName,
    linkedIssueId,
    linkedIssueIdentifier,
  };
}

/** Linear documentUpdate often omits team even after teamId is set; resolve from project when needed. */
async function enrichDocumentTeamFromProject(
  document: LinearApiDocument,
  context?: Awaited<ReturnType<typeof fetchLinearProjectContext>>,
): Promise<LinearApiDocument> {
  const projectId = document.projectId?.trim();
  if (document.teamName?.trim() || !projectId) {
    return document;
  }

  const resolvedContext = context ?? (await fetchLinearProjectContext(projectId));
  return {
    ...document,
    teamId: document.teamId?.trim() || resolvedContext.teamId,
    teamName: resolvedContext.teamName,
    projectName: document.projectName ?? resolvedContext.projectName,
  };
}

export async function enrichLinearApiDocumentsTeamFromProjects(
  documents: LinearApiDocument[],
): Promise<LinearApiDocument[]> {
  const contextByProject = new Map<string, Awaited<ReturnType<typeof fetchLinearProjectContext>>>();
  return Promise.all(
    documents.map(async (document) => {
      const projectId = document.projectId?.trim();
      if (document.teamName?.trim() || !projectId) {
        return document;
      }

      let context = contextByProject.get(projectId);
      if (!context) {
        context = await fetchLinearProjectContext(projectId);
        contextByProject.set(projectId, context);
      }
      return enrichDocumentTeamFromProject(document, context);
    }),
  );
}

const WORKSPACE_DOCUMENTS_PAGE_QUERY = `
  query BacksterWorkspaceDocumentsPage($after: String, $first: Int!) {
    documents(
      first: $first
      after: $after
      includeArchived: false
      orderBy: updatedAt
    ) {
      nodes {
        ${DOCUMENT_FIELDS}
        project {
          id
          name
        }
        team {
          id
          name
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export async function fetchLinearApiProjectDocuments(
  projectId: string,
): Promise<LinearApiDocument[]> {
  const id = projectId.trim();
  if (!id) return [];

  const data = await linearGraphqlRequest<{
    project?: {
      documents?: { nodes?: GraphqlDocumentNode[] } | null;
    } | null;
  }>(PROJECT_DOCUMENTS_QUERY, { projectId: id });

  return (data.project?.documents?.nodes ?? [])
    .map((node) => normalizeDocument(node, { id, name: undefined }))
    .filter((document): document is LinearApiDocument => document != null);
}

export async function fetchLinearApiDocumentById(
  documentId: string,
): Promise<LinearApiDocument | null> {
  const id = documentId.trim();
  if (!id) return null;

  const data = await linearGraphqlRequest<{
    document?: GraphqlDocumentNode | null;
  }>(DOCUMENT_BY_ID_QUERY, { id });

  if (!data.document) return null;
  const document = normalizeDocument(data.document);
  if (!document) return null;
  return enrichDocumentTeamFromProject(document);
}

const PAGE_SIZE = 100;
const MAX_PAGES = 10;
const WORKSPACE_ICON_MAX_PAGES = 20;

async function fetchLinearApiWorkspaceDocumentsPage(
  after: string | undefined,
): Promise<{
  nodes: GraphqlDocumentNode[];
  hasNextPage: boolean;
  endCursor?: string;
}> {
  const data = await linearGraphqlRequest<{
    documents?: {
      nodes?: GraphqlDocumentNode[];
      pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
    } | null;
  }>(WORKSPACE_DOCUMENTS_PAGE_QUERY, { first: PAGE_SIZE, after });

  return {
    nodes: data.documents?.nodes ?? [],
    hasNextPage: Boolean(data.documents?.pageInfo?.hasNextPage),
    endCursor: data.documents?.pageInfo?.endCursor?.trim() || undefined,
  };
}

/** Workspace-wide documents whose Linear `icon` matches exactly (Linear has no icon DocumentFilter). */
export async function fetchLinearApiDocumentsByIcon(icon: string): Promise<LinearApiDocument[]> {
  const targetIcon = icon.trim();
  if (!targetIcon) return [];

  const documents = new Map<string, LinearApiDocument>();
  let after: string | undefined;

  for (let page = 0; page < WORKSPACE_ICON_MAX_PAGES; page++) {
    const pageResult = await fetchLinearApiWorkspaceDocumentsPage(after);

    for (const node of pageResult.nodes) {
      const document = normalizeDocument(node);
      if (document && linearDocumentIconMatches(document.icon, targetIcon)) {
        documents.set(document.id, document);
      }
    }

    if (!pageResult.hasNextPage) break;
    if (!pageResult.endCursor) break;
    after = pageResult.endCursor;
  }

  return [...documents.values()];
}

export async function fetchLinearApiMeetingDocuments(): Promise<LinearApiDocument[]> {
  return fetchLinearApiDocumentsByIcon(LINEAR_MEETING_DOCUMENT_ICON);
}

/** Meeting documents (`Calendar` icon) attached to a single Linear project. */
export async function fetchLinearApiProjectMeetingDocuments(
  projectId: string,
): Promise<LinearApiDocument[]> {
  const documents = await fetchLinearApiProjectDocuments(projectId);
  return documents.filter((document) =>
    linearDocumentIconMatches(document.icon, LINEAR_MEETING_DOCUMENT_ICON),
  );
}

/** All workspace documents, newest by `updatedAt` first (paginated). */
export async function fetchLinearApiWorkspaceDocuments(): Promise<LinearApiDocument[]> {
  const documents = new Map<string, LinearApiDocument>();
  let after: string | undefined;

  for (let page = 0; page < WORKSPACE_ICON_MAX_PAGES; page++) {
    const pageResult = await fetchLinearApiWorkspaceDocumentsPage(after);

    for (const node of pageResult.nodes) {
      const document = normalizeDocument(node);
      if (document) {
        documents.set(document.id, document);
      }
    }

    if (!pageResult.hasNextPage) break;
    if (!pageResult.endCursor) break;
    after = pageResult.endCursor;
  }

  return [...documents.values()].sort((left, right) => {
    const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
    const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
    const safeLeft = Number.isFinite(leftTime) ? leftTime : 0;
    const safeRight = Number.isFinite(rightTime) ? rightTime : 0;
    return safeRight - safeLeft || left.title.localeCompare(right.title);
  });
}

export async function fetchLinearApiTeamDocuments(teamId: string): Promise<LinearApiDocument[]> {
  const id = teamId.trim();
  if (!id) return [];

  const documents = new Map<string, LinearApiDocument>();
  let after: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await linearGraphqlRequest<{
      documents?: {
        nodes?: GraphqlDocumentNode[];
        pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
      } | null;
    }>(TEAM_DOCUMENTS_QUERY, { teamId: id, first: PAGE_SIZE, after });

    for (const node of data.documents?.nodes ?? []) {
      const document = normalizeDocument(node);
      if (document) {
        documents.set(document.id, document);
      }
    }

    if (!data.documents?.pageInfo?.hasNextPage) break;
    const nextCursor = data.documents.pageInfo.endCursor?.trim();
    if (!nextCursor) break;
    after = nextCursor;
  }

  return [...documents.values()];
}

export async function createLinearApiDocument(
  projectId: string,
  title: string,
  content = "",
): Promise<LinearApiDocument> {
  const response = await linearGraphqlRequest<{
    documentCreate?: {
      success?: boolean;
      document?: GraphqlDocumentNode | null;
    } | null;
  }>(DOCUMENT_CREATE_MUTATION, {
    input: {
      projectId: projectId.trim(),
      title: title.trim() || "Untitled note",
      content,
    },
  });

  if (!response.documentCreate?.success) {
    throw new Error("Linear rejected document creation");
  }

  const document = normalizeDocument(response.documentCreate.document ?? {}, {
    id: projectId.trim(),
  });
  if (!document) {
    throw new Error("Linear returned no document");
  }

  return document;
}

export async function createLinearApiTeamDocument(
  teamId: string,
  title: string,
  content = "",
  options?: { issueId?: string },
): Promise<LinearApiDocument> {
  const issueId = options?.issueId?.trim();
  const response = await linearGraphqlRequest<{
    documentCreate?: {
      success?: boolean;
      document?: GraphqlDocumentNode | null;
    } | null;
  }>(DOCUMENT_CREATE_MUTATION, {
    input: {
      teamId: teamId.trim(),
      title: title.trim() || "Untitled note",
      content,
      ...(issueId ? { issueId } : {}),
    },
  });

  if (!response.documentCreate?.success) {
    throw new Error("Linear rejected document creation");
  }

  const document = normalizeDocument(response.documentCreate.document ?? {});
  if (!document) {
    throw new Error("Linear returned no document");
  }

  return document;
}

export async function updateLinearApiDocument(
  documentId: string,
  updates: {
    title?: string;
    content?: string;
    projectId?: string | null;
    teamId?: string;
    icon?: string;
    issueId?: string | null;
  },
): Promise<LinearApiDocument> {
  const input: Record<string, string | null> = {};
  if (updates.title !== undefined) {
    input.title = updates.title;
  }
  if (updates.content !== undefined) {
    input.content = updates.content;
  }
  if (updates.projectId !== undefined) {
    input.projectId = updates.projectId;
  }
  if (updates.teamId !== undefined) {
    input.teamId = updates.teamId;
  }
  if (updates.icon !== undefined) {
    input.icon = updates.icon;
  }
  if (updates.issueId !== undefined) {
    input.issueId = updates.issueId;
  }

  if (Object.keys(input).length === 0) {
    throw new Error("At least one document field is required");
  }

  const response = await linearGraphqlRequest<{
    documentUpdate?: {
      success?: boolean;
      document?: GraphqlDocumentNode | null;
    } | null;
  }>(DOCUMENT_UPDATE_MUTATION, {
    id: documentId.trim(),
    input,
  });

  if (!response.documentUpdate?.success) {
    throw new Error("Linear rejected document update");
  }

  const document = normalizeDocument(response.documentUpdate.document ?? {});
  if (!document) {
    throw new Error("Linear returned no document");
  }

  return document;
}

/** Attach a workspace document to a Linear project and its primary team. */
export async function assignLinearApiDocumentProject(
  documentId: string,
  projectId: string,
): Promise<LinearApiDocument> {
  const id = documentId.trim();
  const project = projectId.trim();
  if (!id || !project) {
    throw new Error("documentId and projectId are required");
  }

  const context = await fetchLinearProjectContext(project);
  const document = await updateLinearApiDocument(id, {
    projectId: context.projectId,
    teamId: context.teamId,
  });
  const enriched = await enrichDocumentTeamFromProject(document, context);
  return enriched;
}

export async function deleteLinearApiDocument(documentId: string): Promise<void> {
  const response = await linearGraphqlRequest<{
    documentDelete?: { success?: boolean } | null;
  }>(DOCUMENT_DELETE_MUTATION, {
    id: documentId.trim(),
  });

  if (!response.documentDelete?.success) {
    throw new Error("Linear rejected document deletion");
  }
}
