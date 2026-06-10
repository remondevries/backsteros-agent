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
