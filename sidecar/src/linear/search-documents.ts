import { linearGraphqlRequest } from "./graphql.ts";

export type LinearSearchDocumentEntity = {
  id: string;
  title: string;
  projectId?: string;
  projectName?: string;
};

type GraphqlSearchDocumentNode = {
  id?: string | null;
  title?: string | null;
  trashed?: boolean | null;
  project?: { id?: string | null; name?: string | null } | null;
};

type GraphqlSearchDocumentsResponse = {
  searchDocuments?: {
    nodes?: GraphqlSearchDocumentNode[] | null;
  } | null;
};

const SEARCH_DOCUMENTS_QUERY = `
  query BacksterSearchDocuments($term: String!, $first: Int!) {
    searchDocuments(term: $term, first: $first) {
      nodes {
        id
        title
        trashed
        project {
          id
          name
        }
      }
    }
  }
`;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function mapSearchDocumentNode(node: GraphqlSearchDocumentNode): LinearSearchDocumentEntity | null {
  const id = node.id?.trim();
  if (!id || node.trashed) return null;

  const title = (node.title ?? "Untitled").trim() || "Untitled";
  const projectId = node.project?.id?.trim() || undefined;
  const projectName = node.project?.name?.trim() || undefined;

  return {
    id,
    title,
    projectId,
    projectName,
  };
}

export async function searchLinearDocuments(
  termInput: string,
  options: { limit?: number } = {},
): Promise<LinearSearchDocumentEntity[]> {
  const term = termInput.trim();
  if (!term) return [];

  const requestedLimit = options.limit ?? DEFAULT_LIMIT;
  const first = Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);

  const response = await linearGraphqlRequest<GraphqlSearchDocumentsResponse>(
    SEARCH_DOCUMENTS_QUERY,
    { term, first },
  );

  const items: LinearSearchDocumentEntity[] = [];
  for (const node of response.searchDocuments?.nodes ?? []) {
    const mapped = mapSearchDocumentNode(node);
    if (mapped) items.push(mapped);
  }
  return items;
}
