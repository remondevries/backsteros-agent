import { linearGraphqlRequest } from "./graphql.ts";

export type LinearApiDocument = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  projectName?: string;
};

type GraphqlDocumentNode = {
  id?: string | null;
  title?: string | null;
  content?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  trashed?: boolean | null;
  project?: { id?: string | null; name?: string | null } | null;
};

const DOCUMENT_FIELDS = `
  id
  title
  content
  createdAt
  updatedAt
  trashed
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
    }
  }
`;

const TEAM_DOCUMENTS_QUERY = `
  query BacksterTeamLinearDocuments($teamId: String!) {
    team(id: $teamId) {
      projects(first: 50, includeArchived: false) {
        nodes {
          id
          name
          documents(first: 100, includeArchived: false) {
            nodes {
              ${DOCUMENT_FIELDS}
            }
          }
        }
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
        createdAt
        updatedAt
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
        updatedAt
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

  return {
    id,
    title: (node.title ?? "Untitled").trim() || "Untitled",
    content: typeof node.content === "string" ? node.content : "",
    createdAt: (node.createdAt ?? "").trim(),
    updatedAt: (node.updatedAt ?? "").trim(),
    projectId,
    projectName,
  };
}

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

  return data.document ? normalizeDocument(data.document) : null;
}

export async function fetchLinearApiTeamDocuments(teamId: string): Promise<LinearApiDocument[]> {
  const id = teamId.trim();
  if (!id) return [];

  const data = await linearGraphqlRequest<{
    team?: {
      projects?: {
        nodes?: Array<{
          id?: string | null;
          name?: string | null;
          documents?: { nodes?: GraphqlDocumentNode[] } | null;
        } | null> | null;
      } | null;
    } | null;
  }>(TEAM_DOCUMENTS_QUERY, { teamId: id });

  const documents: LinearApiDocument[] = [];
  for (const project of data.team?.projects?.nodes ?? []) {
    const projectId = project?.id?.trim();
    const projectName = project?.name?.trim();
    if (!projectId) continue;

    for (const node of project.documents?.nodes ?? []) {
      const document = normalizeDocument(node, {
        id: projectId,
        name: projectName ?? undefined,
      });
      if (document) documents.push(document);
    }
  }

  return documents;
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

export async function updateLinearApiDocument(
  documentId: string,
  updates: { title?: string; content?: string },
): Promise<LinearApiDocument> {
  const input: Record<string, string> = {};
  if (updates.title !== undefined) {
    input.title = updates.title;
  }
  if (updates.content !== undefined) {
    input.content = updates.content;
  }

  if (Object.keys(input).length === 0) {
    throw new Error("title or content is required");
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
