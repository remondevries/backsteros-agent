import { linearGraphqlRequest } from "./graphql.ts";

export type LinearProjectHealth = "onTrack" | "atRisk" | "offTrack";

export type LinearProjectSummary = {
  id: string;
  name: string;
  slugId?: string;
  icon?: string | null;
  priority?: number;
  priorityLabel?: string;
  startDate?: string | null;
  issueCount?: number;
  progress?: number;
  health?: LinearProjectHealth | null;
  status?: {
    id: string;
    name: string;
    type: string;
    position?: number;
  } | null;
};

export type LinearProjectsPage = {
  projects: LinearProjectSummary[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
};

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 50;

const PROJECTS_PAGE_QUERY = `
  query ProjectsPage($first: Int!, $after: String, $filter: ProjectFilter) {
    projects(first: $first, after: $after, filter: $filter, orderBy: updatedAt) {
      nodes {
        id
        name
        slugId
        icon
        priority
        priorityLabel
        startDate
        issueCountHistory
        progress
        health
        status {
          id
          name
          type
          position
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const PROJECT_BY_ID_QUERY = `
  query ProjectById($id: String!) {
    project(id: $id) {
      id
      name
      slugId
      icon
      priority
      priorityLabel
      startDate
      issueCountHistory
      progress
      health
      status {
        id
        name
        type
        position
      }
    }
  }
`;

const TASK_LABEL_QUERY = `
  query TeamTaskLabel($teamId: String!) {
    team(id: $teamId) {
      labels(filter: { name: { eq: "Task" } }, first: 1) {
        nodes {
          id
          name
        }
      }
    }
  }
`;

function normalizePageSize(first?: number): number {
  if (!first || !Number.isFinite(first)) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(Math.trunc(first), 1), MAX_PAGE_SIZE);
}

function normalizeProjectStatus(
  status: { id?: string; name?: string; type?: string; position?: number } | null | undefined,
): LinearProjectSummary["status"] {
  if (!status?.id?.trim() || !status.name?.trim() || !status.type?.trim()) {
    return null;
  }

  return {
    id: status.id.trim(),
    name: status.name.trim(),
    type: status.type.trim(),
    position: Number.isFinite(status.position) ? Number(status.position) : undefined,
  };
}

function latestIssueCount(history: number[] | null | undefined): number | undefined {
  if (!history?.length) return undefined;
  const count = history[history.length - 1];
  return Number.isFinite(count) ? Number(count) : undefined;
}

function normalizeProjectHealth(value: string | null | undefined): LinearProjectHealth | null {
  const health = value?.trim();
  if (health === "onTrack" || health === "atRisk" || health === "offTrack") {
    return health;
  }
  return null;
}

type GraphqlProjectNode = {
  id?: string;
  name?: string;
  slugId?: string;
  icon?: string | null;
  priority?: number | null;
  priorityLabel?: string | null;
  startDate?: string | null;
  issueCount?: number | null;
  issueCountHistory?: number[] | null;
  progress?: number | null;
  health?: string | null;
  status?: { id?: string; name?: string; type?: string; position?: number } | null;
};

function normalizeProjectNode(node: GraphqlProjectNode): LinearProjectSummary | null {
  const id = node.id?.trim();
  const name = node.name?.trim();
  if (!id || !name) return null;

  return {
    id,
    name,
    slugId: node.slugId?.trim() || undefined,
    icon: node.icon ?? null,
    priority: node.priority ?? undefined,
    priorityLabel: node.priorityLabel?.trim() || undefined,
    startDate: node.startDate ?? null,
    issueCount: latestIssueCount(node.issueCountHistory),
    progress: Number.isFinite(node.progress) ? Number(node.progress) : undefined,
    health: normalizeProjectHealth(node.health),
    status: normalizeProjectStatus(node.status),
  };
}

function normalizeProjectNodes(nodes: GraphqlProjectNode[] | undefined): LinearProjectSummary[] {
  const projects: LinearProjectSummary[] = [];
  for (const node of nodes ?? []) {
    const project = normalizeProjectNode(node);
    if (project) projects.push(project);
  }
  return projects;
}

export async function fetchLinearProjectsPage(options: {
  query?: string;
  after?: string | null;
  first?: number;
} = {}): Promise<LinearProjectsPage> {
  const first = normalizePageSize(options.first);
  const search = options.query?.trim();
  const filter = search ? { name: { containsIgnoreCase: search } } : undefined;

  const data = await linearGraphqlRequest<{
    projects?: {
      nodes?: GraphqlProjectNode[];
      pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
    };
  }>(PROJECTS_PAGE_QUERY, {
    first,
    after: options.after ?? null,
    filter,
  });

  const page = data.projects;
  return {
    projects: normalizeProjectNodes(page?.nodes),
    pageInfo: {
      hasNextPage: page?.pageInfo?.hasNextPage ?? false,
      endCursor: page?.pageInfo?.endCursor ?? null,
    },
  };
}

export async function fetchLinearProjectById(projectId: string): Promise<LinearProjectSummary | null> {
  const id = projectId.trim();
  if (!id) return null;

  const data = await linearGraphqlRequest<{
    project?: GraphqlProjectNode | null;
  }>(PROJECT_BY_ID_QUERY, { id });

  const project = data.project;
  if (!project) return null;
  return normalizeProjectNode(project);
}

/** @deprecated Prefer paginated {@link fetchLinearProjectsPage}. */
export async function fetchLinearProjects(): Promise<LinearProjectSummary[]> {
  const projects: LinearProjectSummary[] = [];
  let after: string | null = null;

  for (;;) {
    const page = await fetchLinearProjectsPage({ after, first: MAX_PAGE_SIZE });
    projects.push(...page.projects);
    if (!page.pageInfo.hasNextPage || !page.pageInfo.endCursor) break;
    after = page.pageInfo.endCursor;
  }

  return projects.sort((left, right) => left.name.localeCompare(right.name));
}

export async function resolveTaskLabelId(teamId: string): Promise<string | undefined> {
  const data = await linearGraphqlRequest<{
    team?: {
      labels?: { nodes?: Array<{ id?: string; name?: string }> };
    } | null;
  }>(TASK_LABEL_QUERY, { teamId });

  return data.team?.labels?.nodes?.[0]?.id?.trim() || undefined;
}
