import { linearGraphqlRequest } from "./graphql.ts";

export type LinearProjectIssue = {
  id: string;
  identifier: string;
  title: string;
  status: string;
  stateType?: string;
  statusColor?: string;
  url: string;
  priority: number;
  priorityLabel: string;
  assigneeName: string | null;
  dueDate: string | null;
  estimate: number | null;
  labels: { name: string; color: string }[];
  projectName: string;
};

type GraphqlProjectIssueNode = {
  id?: string | null;
  identifier?: string | null;
  title?: string | null;
  url?: string | null;
  dueDate?: string | null;
  estimate?: number | null;
  priority?: number | null;
  priorityLabel?: string | null;
  state?: { name?: string | null; type?: string | null; color?: string | null } | null;
  assignee?: { name?: string | null } | null;
  labels?: { nodes?: Array<{ name?: string | null; color?: string | null } | null> | null } | null;
};

type GraphqlProjectIssuesResponse = {
  project?: {
    name?: string | null;
    issues?: {
      nodes?: GraphqlProjectIssueNode[];
      pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
    };
  };
};

const BASE_ISSUE_URL = "https://linear.app";
const PAGE_SIZE = 100;
const MAX_PAGES = 10;

const PROJECT_ISSUES_QUERY = `
  query BacksterProjectIssues($projectId: String!, $after: String, $first: Int!) {
    project(id: $projectId) {
      name
      issues(first: $first, after: $after) {
        nodes {
          id
          identifier
          title
          url
          dueDate
          estimate
          priority
          priorityLabel
          state { name type color }
          assignee { name }
          labels(first: 20) { nodes { name color } }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

function normalizeLabelColor(color: string | null | undefined): string {
  return color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#93A2B6";
}

function mapGraphqlProjectIssueNode(
  node: GraphqlProjectIssueNode,
  projectName: string,
  stateFallback: string,
): LinearProjectIssue | null {
  const id = (node.id ?? "").trim();
  const identifier = (node.identifier ?? "").trim();
  if (!id || !identifier) return null;

  const status = (node.state?.name ?? stateFallback).trim() || stateFallback;
  const labels = (node.labels?.nodes ?? [])
    .map((entry) => {
      const name = (entry?.name ?? "").trim();
      if (!name) return null;
      return { name, color: normalizeLabelColor(entry?.color) };
    })
    .filter((entry): entry is { name: string; color: string } => Boolean(entry));

  return {
    id,
    identifier,
    title: (node.title ?? "Untitled").trim() || "Untitled",
    status,
    stateType: (node.state?.type ?? "").trim() || undefined,
    statusColor: (node.state?.color ?? "").trim() || undefined,
    priority: node.priority ?? 0,
    priorityLabel: (node.priorityLabel ?? "").trim(),
    assigneeName: (node.assignee?.name ?? "").trim() || null,
    dueDate: node.dueDate ?? null,
    url: (node.url ?? `${BASE_ISSUE_URL}/issue/${identifier}`).trim(),
    labels,
    projectName,
    estimate: node.estimate ?? null,
  };
}

export async function fetchLinearProjectIssues(projectId: string): Promise<LinearProjectIssue[]> {
  const id = projectId.trim();
  if (!id) return [];

  const items: LinearProjectIssue[] = [];
  let after: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await linearGraphqlRequest<GraphqlProjectIssuesResponse>(PROJECT_ISSUES_QUERY, {
      projectId: id,
      first: PAGE_SIZE,
      after,
    });

    const projectName = (response.project?.name ?? "").trim() || "—";
    const connection = response.project?.issues;

    for (const node of connection?.nodes ?? []) {
      const item = mapGraphqlProjectIssueNode(node, projectName, "Unknown");
      if (item) items.push(item);
    }

    if (!connection?.pageInfo?.hasNextPage) break;
    const nextCursor = connection.pageInfo.endCursor?.trim();
    if (!nextCursor) break;
    after = nextCursor;
  }

  return items;
}
