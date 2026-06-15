import { linearGraphqlRequest } from "./graphql.ts";

export type LinearTeamSummary = {
  id: string;
  key: string;
  name: string;
};

const MAX_PAGE_SIZE = 50;

const TEAMS_PAGE_QUERY = `
  query LinearTeamsPage($first: Int!, $after: String) {
    teams(first: $first, after: $after) {
      nodes {
        id
        key
        name
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

function normalizePageSize(first?: number): number {
  if (first == null || !Number.isFinite(first)) return MAX_PAGE_SIZE;
  return Math.min(Math.max(Math.floor(first), 1), MAX_PAGE_SIZE);
}

function normalizeTeamNode(
  node: { id?: string; key?: string; name?: string } | null | undefined,
): LinearTeamSummary | null {
  const id = node?.id?.trim();
  const key = node?.key?.trim();
  const name = node?.name?.trim();
  if (!id || !key || !name) return null;
  return { id, key, name };
}

export type LinearTeamsPage = {
  teams: LinearTeamSummary[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

export async function fetchLinearTeamsPage(
  options: { after?: string | null; first?: number } = {},
): Promise<LinearTeamsPage> {
  const first = normalizePageSize(options.first);

  const data = await linearGraphqlRequest<{
    teams?: {
      nodes?: Array<{ id?: string; key?: string; name?: string }>;
      pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
    };
  }>(TEAMS_PAGE_QUERY, {
    first,
    after: options.after ?? null,
  });

  const page = data.teams;
  const teams: LinearTeamSummary[] = [];
  for (const node of page?.nodes ?? []) {
    const team = normalizeTeamNode(node);
    if (team) teams.push(team);
  }

  teams.sort((left, right) => left.name.localeCompare(right.name));

  return {
    teams,
    pageInfo: {
      hasNextPage: page?.pageInfo?.hasNextPage ?? false,
      endCursor: page?.pageInfo?.endCursor ?? null,
    },
  };
}

export async function fetchLinearTeams(): Promise<LinearTeamSummary[]> {
  const teams: LinearTeamSummary[] = [];
  const seen = new Set<string>();
  let after: string | null = null;

  for (;;) {
    const page = await fetchLinearTeamsPage({ after, first: MAX_PAGE_SIZE });

    for (const team of page.teams) {
      if (seen.has(team.id)) continue;
      seen.add(team.id);
      teams.push(team);
    }

    if (!page.pageInfo.hasNextPage || !page.pageInfo.endCursor) break;
    after = page.pageInfo.endCursor;
  }

  teams.sort((left, right) => left.name.localeCompare(right.name));
  return teams;
}
