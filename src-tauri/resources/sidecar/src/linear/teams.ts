import { linearGraphqlRequest } from "./graphql.ts";

export type LinearTeamSummary = {
  id: string;
  key: string;
  name: string;
};

const TEAMS_QUERY = `
  query LinearTeams {
    teams {
      nodes {
        id
        key
        name
      }
    }
  }
`;

export async function fetchLinearTeams(): Promise<LinearTeamSummary[]> {
  const data = await linearGraphqlRequest<{
    teams?: {
      nodes?: Array<{ id?: string; key?: string; name?: string }>;
    };
  }>(TEAMS_QUERY, {});

  const teams: LinearTeamSummary[] = [];
  for (const node of data.teams?.nodes ?? []) {
    const id = node.id?.trim();
    const key = node.key?.trim();
    const name = node.name?.trim();
    if (!id || !key || !name) continue;
    teams.push({ id, key, name });
  }

  return teams.sort((left, right) => left.name.localeCompare(right.name));
}
