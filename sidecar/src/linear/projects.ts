import { linearGraphqlRequest } from "./graphql.ts";

export type LinearProjectSummary = {
  id: string;
  name: string;
  slugId?: string;
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

function normalizeProjectNodes(
  nodes:
    | Array<{
        id?: string;
        name?: string;
        slugId?: string;
        status?: { id?: string; name?: string; type?: string; position?: number } | null;
      }>
    | undefined,
): LinearProjectSummary[] {
  const projects: LinearProjectSummary[] = [];
  for (const node of nodes ?? []) {
    const id = node.id?.trim();
    const name = node.name?.trim();
    if (!id || !name) continue;
    projects.push({
      id,
      name,
      slugId: node.slugId?.trim() || undefined,
      status: normalizeProjectStatus(node.status),
    });
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
      nodes?: Array<{
        id?: string;
        name?: string;
        slugId?: string;
        status?: { id?: string; name?: string; type?: string; position?: number } | null;
      }>;
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
    project?: {
      id?: string;
      name?: string;
      slugId?: string;
      status?: { id?: string; name?: string; type?: string; position?: number } | null;
    } | null;
  }>(PROJECT_BY_ID_QUERY, { id });

  const project = data.project;
  if (!project?.id || !project.name?.trim()) return null;

  return {
    id: project.id,
    name: project.name.trim(),
    slugId: project.slugId?.trim() || undefined,
    status: normalizeProjectStatus(project.status),
  };
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
