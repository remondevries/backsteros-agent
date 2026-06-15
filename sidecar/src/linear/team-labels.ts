import { linearGraphqlRequest } from "./graphql.ts";
import type { LinearIssueDetailLabel } from "./issue-detail.ts";

export const WORKOUT_SET_LABEL_GROUP = "Set";
export const WORKOUT_REP_LABEL_GROUP = "Reps";

const TEAM_LABELS_QUERY = `
  query BacksterTeamLabels($teamId: ID!) {
    issueLabels(first: 250, filter: { team: { id: { eq: $teamId } } }) {
      nodes {
        id
        name
        color
      }
    }
  }
`;

const TEAM_LABEL_GROUP_QUERY = `
  query BacksterTeamLabelGroup($teamId: ID!, $groupName: String!) {
    issueLabels(first: 250, filter: {
      team: { id: { eq: $teamId } },
      parent: { name: { eq: $groupName } }
    }) {
      nodes {
        id
        name
        color
      }
    }
  }
`;

function normalizeLabelColor(color: string | null | undefined): string {
  return color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#93A2B6";
}

function mapLabelNodes(
  nodes:
    | Array<{
        id?: string | null;
        name?: string | null;
        color?: string | null;
      } | null>
    | null
    | undefined,
): LinearIssueDetailLabel[] {
  const entries = (nodes ?? [])
    .map((entry) => {
      const labelId = (entry?.id ?? "").trim();
      const name = (entry?.name ?? "").trim();
      if (!labelId || !name) return null;
      return { id: labelId, name, color: normalizeLabelColor(entry?.color) };
    })
    .filter((entry): entry is LinearIssueDetailLabel => Boolean(entry));

  return Array.from(new Map(entries.map((entry) => [entry.id, entry])).values()).sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
  );
}

export async function fetchLinearTeamLabels(teamId: string): Promise<LinearIssueDetailLabel[]> {
  const id = teamId.trim();
  if (!id) {
    throw new Error("Linear team id is required");
  }

  const data = await linearGraphqlRequest<{
    issueLabels?: {
      nodes?: Array<{
        id?: string | null;
        name?: string | null;
        color?: string | null;
      } | null> | null;
    } | null;
  }>(TEAM_LABELS_QUERY, { teamId: id });

  return mapLabelNodes(data.issueLabels?.nodes);
}

export async function fetchLinearTeamLabelGroupLabels(
  teamId: string,
  groupName: string,
): Promise<LinearIssueDetailLabel[]> {
  const id = teamId.trim();
  const normalizedGroupName = groupName.trim();
  if (!id) {
    throw new Error("Linear team id is required");
  }
  if (!normalizedGroupName) {
    throw new Error("Label group name is required");
  }

  const data = await linearGraphqlRequest<{
    issueLabels?: {
      nodes?: Array<{
        id?: string | null;
        name?: string | null;
        color?: string | null;
      } | null> | null;
    } | null;
  }>(TEAM_LABEL_GROUP_QUERY, { teamId: id, groupName: normalizedGroupName });

  return mapLabelNodes(data.issueLabels?.nodes);
}
