import { linearGraphqlRequest } from "./graphql.ts";
import { cachedLinearList, invalidateLinearListCacheByPrefix, linearListCacheKeys } from "./list-cache.ts";

export type LinearTeamProjectSummary = {
  id: string;
  name: string;
};

type GraphqlTeamProjectNode = {
  id?: string | null;
  name?: string | null;
};

const TEAM_PROJECTS_QUERY = `
  query BacksterTeamProjects($teamId: String!) {
    team(id: $teamId) {
      projects(first: 100, includeArchived: false) {
        nodes {
          id
          name
        }
      }
    }
  }
`;

function normalizeTeamProjectNode(node: GraphqlTeamProjectNode): LinearTeamProjectSummary | null {
  const id = node.id?.trim();
  const name = node.name?.trim();
  if (!id || !name) return null;
  return { id, name };
}

export async function fetchLinearTeamProjects(
  teamId: string,
  options?: { force?: boolean },
): Promise<LinearTeamProjectSummary[]> {
  const id = teamId.trim();
  if (!id) return [];

  return cachedLinearList(
    linearListCacheKeys.teamProjects(id),
    async () => {
      const data = await linearGraphqlRequest<{
        team?: {
          projects?: {
            nodes?: GraphqlTeamProjectNode[] | null;
          } | null;
        } | null;
      }>(TEAM_PROJECTS_QUERY, { teamId: id });

      const projects: LinearTeamProjectSummary[] = [];
      for (const node of data.team?.projects?.nodes ?? []) {
        const project = normalizeTeamProjectNode(node);
        if (project) projects.push(project);
      }

      return projects.sort((left, right) => left.name.localeCompare(right.name));
    },
    { force: options?.force },
  );
}

const PROJECT_CREATE_MUTATION = `
  mutation BacksterTeamProjectCreate($input: ProjectCreateInput!) {
    projectCreate(input: $input) {
      success
      project {
        id
        name
      }
    }
  }
`;

export type CreateLinearTeamProjectOptions = {
  icon?: string | null;
  color?: string | null;
};

export async function createLinearTeamProject(
  teamId: string,
  name = "Untitled folder",
  options?: CreateLinearTeamProjectOptions,
): Promise<LinearTeamProjectSummary> {
  const id = teamId.trim();
  const projectName = name.trim() || "Untitled folder";
  if (!id) {
    throw new Error("teamId is required");
  }

  const input: Record<string, unknown> = {
    name: projectName,
    teamIds: [id],
  };
  const icon = options?.icon?.trim();
  const color = options?.color?.trim();
  if (icon) input.icon = icon;
  if (color) input.color = color;

  const data = await linearGraphqlRequest<{
    projectCreate?: {
      success?: boolean;
      project?: GraphqlTeamProjectNode | null;
    } | null;
  }>(PROJECT_CREATE_MUTATION, {
    input,
  });

  if (!data.projectCreate?.success) {
    throw new Error("Failed to create folder");
  }

  const project = normalizeTeamProjectNode(data.projectCreate.project ?? {});
  if (!project) {
    throw new Error("Failed to create folder");
  }

  invalidateLinearListCacheByPrefix("team-projects:");
  return project;
}
