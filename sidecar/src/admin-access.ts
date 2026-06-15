import { linearGraphqlRequest } from "./linear/graphql.ts";
import { fetchLinearTeams } from "./linear/teams.ts";
import { getLinearAuthToken } from "./linear/auth-token.ts";

/** Linear team or organization id — see agent/project.config.json → administrator */
export const ADMINISTRATOR_LINEAR_SCOPE_ID =
  process.env.BACKSTER_ADMIN_LINEAR_SCOPE_ID?.trim() ||
  "d10ef989-a610-4b9e-9275-c9f58e23045e";

export async function viewerHasAdministratorAccess(): Promise<boolean> {
  const token = getLinearAuthToken();
  if (!token) {
    return false;
  }

  const scopeId = ADMINISTRATOR_LINEAR_SCOPE_ID;
  const teams = await fetchLinearTeams();
  if (teams.some((team) => team.id === scopeId)) {
    return true;
  }

  const data = await linearGraphqlRequest<{
    viewer?: { organization?: { id?: string | null } | null } | null;
  }>(`query BacksterAdministratorScope { viewer { organization { id } } }`);

  return data.viewer?.organization?.id?.trim() === scopeId;
}
