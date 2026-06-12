import { linearGraphqlRequest } from "./graphql.ts";

export type LinearApiDocument = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type GraphqlDocumentNode = {
  id?: string | null;
  title?: string | null;
  content?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  trashed?: boolean | null;
};

const PROJECT_DOCUMENTS_QUERY = `
  query BacksterProjectLinearDocuments($projectId: String!) {
    project(id: $projectId) {
      documents(first: 100, includeArchived: false) {
        nodes {
          id
          title
          content
          createdAt
          updatedAt
          trashed
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

function normalizeDocument(node: GraphqlDocumentNode): LinearApiDocument | null {
  const id = node.id?.trim();
  if (!id || node.trashed) return null;

  return {
    id,
    title: (node.title ?? "Untitled").trim() || "Untitled",
    content: typeof node.content === "string" ? node.content : "",
    createdAt: (node.createdAt ?? "").trim(),
    updatedAt: (node.updatedAt ?? "").trim(),
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
    .map((node) => normalizeDocument(node))
    .filter((document): document is LinearApiDocument => document != null);
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

  const document = normalizeDocument(response.documentCreate.document ?? {});
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
