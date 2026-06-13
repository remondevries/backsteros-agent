import type { LinearIssueEntity } from "../types.ts";
import { linearGraphqlRequest } from "./graphql.ts";

type GraphqlSearchIssueNode = {
  id?: string | null;
  identifier?: string | null;
  title?: string | null;
  url?: string | null;
  priority?: number | null;
  priorityLabel?: string | null;
  state?: { name?: string | null; type?: string | null; color?: string | null } | null;
  project?: { name?: string | null } | null;
  assignee?: { displayName?: string | null; avatarUrl?: string | null } | null;
};

type GraphqlSearchIssuesResponse = {
  searchIssues?: {
    nodes?: GraphqlSearchIssueNode[] | null;
  } | null;
};

const SEARCH_ISSUES_QUERY = `
  query BacksterSearchIssues($term: String!, $first: Int!) {
    searchIssues(term: $term, first: $first) {
      nodes {
        id
        identifier
        title
        url
        priority
        priorityLabel
        state {
          name
          type
          color
        }
        project {
          name
        }
        assignee {
          displayName
          avatarUrl
        }
      }
    }
  }
`;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function mapSearchIssueNode(node: GraphqlSearchIssueNode): LinearIssueEntity | null {
  const id = node.id?.trim();
  const title = node.title?.trim();
  if (!id || !title) return null;

  const identifier = node.identifier?.trim() || id;
  return {
    id,
    identifier,
    title,
    url: node.url?.trim() || undefined,
    status: node.state?.name?.trim() || undefined,
    stateType: node.state?.type?.trim() || undefined,
    statusColor: node.state?.color?.trim() || undefined,
    priority: node.priority ?? undefined,
    priorityLabel: node.priorityLabel?.trim() || undefined,
    projectName: node.project?.name?.trim() || undefined,
    assigneeName: node.assignee?.displayName?.trim() || undefined,
    assigneeAvatarUrl: node.assignee?.avatarUrl?.trim() || undefined,
  };
}

export async function searchLinearIssues(
  termInput: string,
  options: { limit?: number } = {},
): Promise<LinearIssueEntity[]> {
  const term = termInput.trim();
  if (!term) return [];

  const requestedLimit = options.limit ?? DEFAULT_LIMIT;
  const first = Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);

  const response = await linearGraphqlRequest<GraphqlSearchIssuesResponse>(SEARCH_ISSUES_QUERY, {
    term,
    first,
  });

  const items: LinearIssueEntity[] = [];
  for (const node of response.searchIssues?.nodes ?? []) {
    const mapped = mapSearchIssueNode(node);
    if (mapped) items.push(mapped);
  }
  return items;
}
