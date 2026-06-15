import { linearGraphqlRequest } from "./graphql.ts";

export type LinearWorkflowState = {
  id: string;
  name: string;
  type: string;
};

export type LinearProjectContext = {
  projectId: string;
  projectName: string;
  teamId: string;
  teamKey?: string;
  teamName?: string;
  states: LinearWorkflowState[];
};

const PROJECT_CONTEXT_QUERY = `
  query GroceryProjectContext($projectId: String!) {
    project(id: $projectId) {
      id
      name
      teams {
        nodes {
          id
          key
          name
          states {
            nodes {
              id
              name
              type
            }
          }
        }
      }
    }
  }
`;

const VIEWER_QUERY = `
  query GroceryViewer {
    viewer {
      id
    }
  }
`;

const TEAM_CONTEXT_QUERY = `
  query BacksterTeamContext($teamId: String!) {
    team(id: $teamId) {
      id
      name
      states {
        nodes {
          id
          name
          type
        }
      }
    }
  }
`;

const teamContextCache = new Map<
  string,
  { value: { teamId: string; teamName?: string; states: LinearWorkflowState[] }; expiresAt: number }
>();
const TEAM_CONTEXT_TTL_MS = 10 * 60 * 1000;

export async function fetchLinearProjectContext(projectId: string): Promise<LinearProjectContext> {
  const id = projectId.trim();
  if (!id) {
    throw new Error("Linear project id is required");
  }

  const data = await linearGraphqlRequest<{
    project?: {
      id?: string;
      name?: string;
      teams?: {
        nodes?: Array<{
          id?: string;
          key?: string;
          name?: string;
          states?: { nodes?: Array<{ id?: string; name?: string; type?: string }> };
        }>;
      };
    } | null;
  }>(PROJECT_CONTEXT_QUERY, { projectId: id });

  const project = data.project;
  const team = project?.teams?.nodes?.[0];
  const teamId = team?.id?.trim();
  const projectName = project?.name?.trim();

  if (!project?.id || !projectName || !teamId) {
    throw new Error("Could not resolve Linear project team for grocery list");
  }

  const states = (team?.states?.nodes ?? [])
    .map((state) => {
      const stateId = state.id?.trim();
      const name = state.name?.trim();
      const type = state.type?.trim();
      if (!stateId || !name || !type) return null;
      return { id: stateId, name, type } satisfies LinearWorkflowState;
    })
    .filter((state): state is LinearWorkflowState => state != null);

  return {
    projectId: project.id,
    projectName,
    teamId,
    teamKey: team?.key?.trim() || undefined,
    teamName: team?.name?.trim() || undefined,
    states,
  };
}

export async function fetchLinearTeamContext(teamId: string): Promise<{
  teamId: string;
  teamName?: string;
  states: LinearWorkflowState[];
}> {
  const id = teamId.trim();
  if (!id) {
    throw new Error("Linear team id is required");
  }

  const cached = teamContextCache.get(id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const data = await linearGraphqlRequest<{
    team?: {
      id?: string;
      name?: string;
      states?: { nodes?: Array<{ id?: string; name?: string; type?: string }> };
    } | null;
  }>(TEAM_CONTEXT_QUERY, { teamId: id });

  const team = data.team;
  const resolvedTeamId = team?.id?.trim();
  if (!resolvedTeamId) {
    throw new Error("Could not resolve Linear team");
  }

  const states = (team?.states?.nodes ?? [])
    .map((state) => {
      const stateId = state.id?.trim();
      const name = state.name?.trim();
      const type = state.type?.trim();
      if (!stateId || !name || !type) return null;
      return { id: stateId, name, type } satisfies LinearWorkflowState;
    })
    .filter((state): state is LinearWorkflowState => state != null);

  const result = {
    teamId: resolvedTeamId,
    teamName: team?.name?.trim() || undefined,
    states,
  };

  teamContextCache.set(id, {
    value: result,
    expiresAt: Date.now() + TEAM_CONTEXT_TTL_MS,
  });

  return result;
}

export function seedLinearTeamContextCache(
  teamId: string,
  states: LinearWorkflowState[],
  teamName?: string,
): void {
  const id = teamId.trim();
  if (!id || states.length === 0) return;

  teamContextCache.set(id, {
    value: { teamId: id, teamName, states },
    expiresAt: Date.now() + TEAM_CONTEXT_TTL_MS,
  });
}

export function resolveWorkflowStateId(
  states: LinearWorkflowState[],
  preferredNames: string[],
  fallbackType?: string,
): string | undefined {
  const normalized = new Map(
    states.map((state) => [state.name.trim().toLowerCase(), state.id] as const),
  );

  for (const name of preferredNames) {
    const match = normalized.get(name.trim().toLowerCase());
    if (match) return match;
  }

  if (fallbackType) {
    const typeMatch = states.find(
      (state) => state.type.trim().toLowerCase() === fallbackType.trim().toLowerCase(),
    );
    if (typeMatch) return typeMatch.id;
  }

  return undefined;
}

export async function fetchLinearViewerId(): Promise<string | undefined> {
  const data = await linearGraphqlRequest<{
    viewer?: { id?: string } | null;
  }>(VIEWER_QUERY, {});

  return data.viewer?.id?.trim() || undefined;
}
