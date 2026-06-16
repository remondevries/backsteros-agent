import { linearGraphqlRequest } from "./graphql.ts";
import { cachedLinearList, linearListCacheKeys } from "./list-cache.ts";
import { invalidateLinearIssueListCaches } from "./list-cache-invalidate.ts";
import {
  fetchLinearProjectContext,
  fetchLinearTeamContext,
  resolveWorkflowStateId,
  seedLinearTeamContextCache,
} from "./project-context.ts";

export type LinearProjectIssue = {
  id: string;
  identifier: string;
  title: string;
  status: string;
  stateId: string | null;
  stateType?: string;
  statusColor?: string;
  url: string;
  priority: number;
  priorityLabel: string;
  assigneeName: string | null;
  assigneeAvatarUrl: string | null;
  dueDate: string | null;
  estimate: number | null;
  labels: { name: string; color: string }[];
  projectName: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type LinearProjectWorkflowState = {
  id: string;
  name: string;
  type: string;
  color?: string;
  position?: number;
};

function sortWorkflowStates(states: LinearProjectWorkflowState[]): LinearProjectWorkflowState[] {
  return [...states].sort((left, right) => {
    const leftPosition = Number.isFinite(left.position) ? Number(left.position) : Number.NaN;
    const rightPosition = Number.isFinite(right.position) ? Number(right.position) : Number.NaN;
    if (Number.isFinite(leftPosition) && Number.isFinite(rightPosition) && leftPosition !== rightPosition) {
      return leftPosition - rightPosition;
    }
    if (Number.isFinite(leftPosition) && !Number.isFinite(rightPosition)) return -1;
    if (!Number.isFinite(leftPosition) && Number.isFinite(rightPosition)) return 1;
    return left.name.localeCompare(right.name);
  });
}

export type LinearProjectIssuesResult = {
  issues: LinearProjectIssue[];
  workflowStates: LinearProjectWorkflowState[];
};

type GraphqlProjectIssueNode = {
  id?: string | null;
  identifier?: string | null;
  title?: string | null;
  url?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  dueDate?: string | null;
  estimate?: number | null;
  priority?: number | null;
  priorityLabel?: string | null;
  state?: {
    id?: string | null;
    name?: string | null;
    type?: string | null;
    color?: string | null;
    position?: number | null;
  } | null;
  assignee?: { name?: string | null; avatarUrl?: string | null } | null;
  labels?: { nodes?: Array<{ name?: string | null; color?: string | null } | null> | null } | null;
  project?: { id?: string | null; name?: string | null } | null;
};

type GraphqlTeamIssuesResponse = {
  team?: {
    states?: {
      nodes?:
        | Array<
            | {
                id?: string | null;
                name?: string | null;
                type?: string | null;
                color?: string | null;
                position?: number | null;
              }
            | null
          >
        | null;
    } | null;
    issues?: {
      nodes?: GraphqlProjectIssueNode[];
      pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
    };
  };
};

type GraphqlProjectIssuesResponse = {
  project?: {
    name?: string | null;
    teams?: {
      nodes?:
        | Array<
            | {
                states?: {
                  nodes?:
                    | Array<
                        | {
                            id?: string | null;
                            name?: string | null;
                            type?: string | null;
                            color?: string | null;
                            position?: number | null;
                          }
                        | null
                      >
                    | null;
                } | null;
              }
            | null
          >
        | null;
    } | null;
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
      teams {
        nodes {
          states {
            nodes { id name type color position }
          }
        }
      }
      issues(first: $first, after: $after) {
        nodes {
          id
          identifier
          title
          url
          createdAt
          updatedAt
          dueDate
          estimate
          priority
          priorityLabel
          state { id name type color position }
          assignee { name avatarUrl }
          labels(first: 20) { nodes { name color } }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

const TEAM_ISSUES_QUERY = `
  query BacksterTeamIssues($teamId: String!, $after: String, $first: Int!) {
    team(id: $teamId) {
      states {
        nodes { id name type color position }
      }
      issues(first: $first, after: $after, orderBy: updatedAt) {
        nodes {
          id
          identifier
          title
          url
          createdAt
          updatedAt
          dueDate
          estimate
          priority
          priorityLabel
          state { id name type color position }
          assignee { name avatarUrl }
          labels(first: 20) { nodes { name color } }
          project { id name }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

const TEAM_ROOT_ISSUES_QUERY = `
  query BacksterTeamRootIssues($teamId: String!, $after: String, $first: Int!) {
    team(id: $teamId) {
      states {
        nodes { id name type color position }
      }
      issues(first: $first, after: $after, orderBy: updatedAt, filter: { parent: { null: true } }) {
        nodes {
          id
          identifier
          title
          url
          createdAt
          updatedAt
          dueDate
          estimate
          priority
          priorityLabel
          state { id name type color position }
          assignee { name avatarUrl }
          labels(first: 20) { nodes { name color } }
          project { id name }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

const TEAM_ISSUE_CREATE_MUTATION = `
  mutation BacksterTeamIssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        identifier
        title
        url
        createdAt
        updatedAt
        dueDate
        estimate
        priority
        priorityLabel
        state { id name type color position }
        assignee { name avatarUrl }
        labels(first: 20) { nodes { name color } }
        project { id name }
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

  const resolvedProjectName =
    (node.project?.name ?? projectName).trim() || projectName || "—";
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
    stateId: (node.state?.id ?? "").trim() || null,
    stateType: (node.state?.type ?? "").trim() || undefined,
    statusColor: (node.state?.color ?? "").trim() || undefined,
    priority: node.priority ?? 0,
    priorityLabel: (node.priorityLabel ?? "").trim(),
    assigneeName: (node.assignee?.name ?? "").trim() || null,
    assigneeAvatarUrl: (node.assignee?.avatarUrl ?? "").trim() || null,
    dueDate: node.dueDate ?? null,
    url: (node.url ?? `${BASE_ISSUE_URL}/issue/${identifier}`).trim(),
    labels,
    projectName: resolvedProjectName,
    estimate: node.estimate ?? null,
    createdAt: (node.createdAt ?? "").trim() || null,
    updatedAt: (node.updatedAt ?? "").trim() || null,
  };
}

function mapWorkflowStateNode(
  node:
    | {
        id?: string | null;
        name?: string | null;
        type?: string | null;
        color?: string | null;
        position?: number | null;
      }
    | null
    | undefined,
): LinearProjectWorkflowState | null {
  const id = (node?.id ?? "").trim();
  const name = (node?.name ?? "").trim();
  const type = (node?.type ?? "").trim();
  if (!id || !name || !type) return null;
  const color = (node?.color ?? "").trim() || undefined;
  const position = Number.isFinite(node?.position) ? Number(node?.position) : undefined;
  return { id, name, type, color, position };
}

export async function fetchLinearProjectIssues(
  projectId: string,
  options?: { force?: boolean },
): Promise<LinearProjectIssuesResult> {
  const id = projectId.trim();
  if (!id) return { issues: [], workflowStates: [] };

  return cachedLinearList(
    linearListCacheKeys.projectIssues(id),
    async () => {
      const items: LinearProjectIssue[] = [];
      const workflowStates = new Map<string, LinearProjectWorkflowState>();
      let after: string | undefined;

      for (let page = 0; page < MAX_PAGES; page++) {
        const response = await linearGraphqlRequest<GraphqlProjectIssuesResponse>(PROJECT_ISSUES_QUERY, {
          projectId: id,
          first: PAGE_SIZE,
          after,
        });

        const projectName = (response.project?.name ?? "").trim() || "—";
        const connection = response.project?.issues;

        for (const teamNode of response.project?.teams?.nodes ?? []) {
          for (const stateNode of teamNode?.states?.nodes ?? []) {
            const mappedState = mapWorkflowStateNode(stateNode);
            if (mappedState) {
              workflowStates.set(mappedState.id, mappedState);
            }
          }
        }

        for (const node of connection?.nodes ?? []) {
          const item = mapGraphqlProjectIssueNode(node, projectName, "Unknown");
          if (item) items.push(item);
        }

        if (!connection?.pageInfo?.hasNextPage) break;
        const nextCursor = connection.pageInfo.endCursor?.trim();
        if (!nextCursor) break;
        after = nextCursor;
      }

      return { issues: items, workflowStates: sortWorkflowStates([...workflowStates.values()]) };
    },
    { force: options?.force },
  );
}

export async function fetchLinearTeamIssues(
  teamId: string,
  options?: { excludeSubIssues?: boolean; force?: boolean },
): Promise<LinearProjectIssuesResult> {
  const id = teamId.trim();
  if (!id) return { issues: [], workflowStates: [] };

  const excludeSubIssues = options?.excludeSubIssues ?? false;

  return cachedLinearList(
    linearListCacheKeys.teamIssues(id, excludeSubIssues),
    async () => {
      const issuesQuery = excludeSubIssues ? TEAM_ROOT_ISSUES_QUERY : TEAM_ISSUES_QUERY;
      const items: LinearProjectIssue[] = [];
      const workflowStates = new Map<string, LinearProjectWorkflowState>();
      let after: string | undefined;

      for (let page = 0; page < MAX_PAGES; page++) {
        const response = await linearGraphqlRequest<GraphqlTeamIssuesResponse>(issuesQuery, {
          teamId: id,
          first: PAGE_SIZE,
          after,
        });

        const connection = response.team?.issues;

        for (const stateNode of response.team?.states?.nodes ?? []) {
          const mappedState = mapWorkflowStateNode(stateNode);
          if (mappedState) {
            workflowStates.set(mappedState.id, mappedState);
          }
        }

        if (page === 0 && workflowStates.size > 0) {
          seedLinearTeamContextCache(
            id,
            [...workflowStates.values()].map((state) => ({
              id: state.id,
              name: state.name,
              type: state.type,
            })),
          );
        }

        for (const node of connection?.nodes ?? []) {
          const item = mapGraphqlProjectIssueNode(node, "—", "Unknown");
          if (item) items.push(item);
        }

        if (!connection?.pageInfo?.hasNextPage) break;
        const nextCursor = connection.pageInfo.endCursor?.trim();
        if (!nextCursor) break;
        after = nextCursor;
      }

      return {
        issues: items,
        workflowStates: sortWorkflowStates([...workflowStates.values()]),
      };
    },
    { force: options?.force },
  );
}

export async function createLinearTeamIssue(
  teamId: string,
  options?: { title?: string },
): Promise<LinearProjectIssue> {
  const id = teamId.trim();
  if (!id) {
    throw new Error("teamId is required");
  }

  const teamContext = await fetchLinearTeamContext(id);
  const stateId = resolveWorkflowStateId(
    teamContext.states,
    ["Triage", "Backlog", "Todo"],
    "unstarted",
  );
  if (!stateId) {
    throw new Error("Could not resolve an initial workflow state for this team");
  }

  const title = options?.title?.trim() || "Untitled";

  const data = await linearGraphqlRequest<{
    issueCreate?: {
      success?: boolean;
      issue?: GraphqlProjectIssueNode | null;
    } | null;
  }>(TEAM_ISSUE_CREATE_MUTATION, {
    input: {
      teamId: teamContext.teamId,
      title,
      stateId,
    },
  });

  const node = data.issueCreate?.issue;
  if (!data.issueCreate?.success || !node) {
    throw new Error("Linear did not create the inbox issue");
  }

  const issue = mapGraphqlProjectIssueNode(node, "—", "Unknown");
  if (!issue) {
    throw new Error("Linear returned an invalid inbox issue");
  }

  invalidateLinearIssueListCaches();
  return issue;
}

export async function createLinearProjectIssue(
  projectId: string,
  options?: { title?: string },
): Promise<LinearProjectIssue> {
  const id = projectId.trim();
  if (!id) {
    throw new Error("projectId is required");
  }

  const projectContext = await fetchLinearProjectContext(id);
  const stateId = resolveWorkflowStateId(
    projectContext.states,
    ["Triage", "Backlog", "Todo"],
    "unstarted",
  );
  if (!stateId) {
    throw new Error("Could not resolve an initial workflow state for this project");
  }

  const title = options?.title?.trim() || "Untitled";

  const data = await linearGraphqlRequest<{
    issueCreate?: {
      success?: boolean;
      issue?: GraphqlProjectIssueNode | null;
    } | null;
  }>(TEAM_ISSUE_CREATE_MUTATION, {
    input: {
      teamId: projectContext.teamId,
      projectId: projectContext.projectId,
      title,
      stateId,
    },
  });

  const node = data.issueCreate?.issue;
  if (!data.issueCreate?.success || !node) {
    throw new Error("Linear did not create the project issue");
  }

  const issue = mapGraphqlProjectIssueNode(node, projectContext.projectName, "Unknown");
  if (!issue) {
    throw new Error("Linear returned an invalid project issue");
  }

  invalidateLinearIssueListCaches();
  return issue;
}
