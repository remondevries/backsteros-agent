import type { LinearTeamSummary } from "./api";

export function formatLinearTeamLabel(team: LinearTeamSummary): string {
  return team.name.trim() || team.key;
}

export function resolveLinearTeam(
  teamId: string,
  teams: LinearTeamSummary[],
): LinearTeamSummary | null {
  const normalized = teamId.trim();
  if (!normalized) return null;
  return teams.find((team) => team.id === normalized) ?? null;
}

export function resolveLinearTeamLabel(
  teamId: string,
  teams: LinearTeamSummary[],
): string | null {
  const team = resolveLinearTeam(teamId, teams);
  return team ? formatLinearTeamLabel(team) : null;
}

export function formatUnsetTeamSelection(): string {
  return "Not selected";
}
