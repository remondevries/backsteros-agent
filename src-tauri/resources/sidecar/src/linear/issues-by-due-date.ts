import { enrichLinearResult } from "../enrichers/linear.ts";
import type { LinearIssueEntity } from "../types.ts";
import { linearGraphqlRequest } from "./graphql.ts";

type GraphqlIssueNode = {
  id?: string | null;
  identifier?: string | null;
  title?: string | null;
  priority?: number | null;
  dueDate?: string | null;
  url?: string | null;
  state?: { name?: string | null; type?: string | null; color?: string | null } | null;
  assignee?:
    | {
        id?: string | null;
        displayName?: string | null;
        avatarUrl?: string | null;
      }
    | null;
  project?: { name?: string | null } | null;
};

type GraphqlIssuesConnection = {
  nodes?: GraphqlIssueNode[] | null;
  pageInfo?: { hasNextPage?: boolean | null; endCursor?: string | null } | null;
};

type GraphqlIssuesByDueDatesResponse = {
  issues?: GraphqlIssuesConnection | null;
};

const PAGE_SIZE = 100;
const MAX_PAGES = 10;
const DUE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const ISSUES_BY_DUE_DATES_QUERY = `
  query BacksterIssuesByDueDates($dueDates: [TimelessDateOrDuration!]!, $after: String, $first: Int!) {
    issues(
      filter: {
        dueDate: { in: $dueDates }
      }
      first: $first
      after: $after
      orderBy: updatedAt
    ) {
      nodes {
        id
        identifier
        title
        priority
        dueDate
        url
        state {
          name
          type
          color
        }
        assignee {
          id
          displayName
          avatarUrl
        }
        project {
          name
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const ISSUES_BY_SINGLE_DUE_DATE_QUERY = `
  query BacksterIssuesBySingleDueDate($dueDate: TimelessDateOrDuration!, $after: String, $first: Int!) {
    issues(
      filter: {
        dueDate: { eq: $dueDate }
      }
      first: $first
      after: $after
      orderBy: updatedAt
    ) {
      nodes {
        id
        identifier
        title
        priority
        dueDate
        url
        state {
          name
          type
          color
        }
        assignee {
          id
          displayName
          avatarUrl
        }
        project {
          name
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

function normalizeDueDates(dueDates: string[]): string[] {
  const deduped = Array.from(
    new Set(
      dueDates
        .map((value) => value.trim())
        .filter((value) => DUE_DATE_PATTERN.test(value)),
    ),
  );
  deduped.sort((left, right) => left.localeCompare(right));
  return deduped;
}

async function fetchIssueNodesForDueDates(dueDates: string[]): Promise<GraphqlIssueNode[]> {
  const nodes: GraphqlIssueNode[] = [];
  let after: string | null = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const response = await linearGraphqlRequest<GraphqlIssuesByDueDatesResponse>(
      ISSUES_BY_DUE_DATES_QUERY,
      { dueDates, first: PAGE_SIZE, after },
    );
    const connection = response.issues;
    nodes.push(...(connection?.nodes ?? []));
    if (!connection?.pageInfo?.hasNextPage || !connection.pageInfo.endCursor) {
      break;
    }
    after = connection.pageInfo.endCursor;
  }

  return nodes;
}

async function fetchIssueNodesForSingleDueDate(dueDate: string): Promise<GraphqlIssueNode[]> {
  const nodes: GraphqlIssueNode[] = [];
  let after: string | null = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const response = await linearGraphqlRequest<GraphqlIssuesByDueDatesResponse>(
      ISSUES_BY_SINGLE_DUE_DATE_QUERY,
      { dueDate, first: PAGE_SIZE, after },
    );
    const connection = response.issues;
    nodes.push(...(connection?.nodes ?? []));
    if (!connection?.pageInfo?.hasNextPage || !connection.pageInfo.endCursor) {
      break;
    }
    after = connection.pageInfo.endCursor;
  }

  return nodes;
}

export async function fetchLinearIssuesByDueDates(
  dueDatesInput: string[],
): Promise<Record<string, LinearIssueEntity[]>> {
  const dueDates = normalizeDueDates(dueDatesInput);
  const issuesByDueDate = Object.fromEntries(
    dueDates.map((dueDate) => [dueDate, [] as LinearIssueEntity[]]),
  ) as Record<string, LinearIssueEntity[]>;
  if (dueDates.length === 0) return issuesByDueDate;

  let nodes: GraphqlIssueNode[] = [];
  try {
    nodes = await fetchIssueNodesForDueDates(dueDates);
  } catch {
    // Fallback: query each due date separately in case `in` filter support differs by account.
    for (const dueDate of dueDates) {
      const perDateNodes = await fetchIssueNodesForSingleDueDate(dueDate);
      nodes.push(...perDateNodes);
    }
  }

  const enriched = await enrichLinearResult(
    { nodes },
    undefined,
    "linear.issues-by-due-dates",
    { includeCompleted: true },
  );
  if (enriched?.type !== "linear_issues") {
    return issuesByDueDate;
  }

  const issueById = new Map<string, LinearIssueEntity>();
  for (const issue of enriched.items) {
    if (!issue.id) continue;
    issueById.set(issue.id, issue);
  }

  for (const issue of issueById.values()) {
    const dueDate = issue.dueDate?.trim();
    if (!dueDate || !(dueDate in issuesByDueDate)) continue;
    issuesByDueDate[dueDate]?.push(issue);
  }

  for (const dueDate of dueDates) {
    issuesByDueDate[dueDate]?.sort((left, right) => {
      const leftId = left.identifier ?? left.id;
      const rightId = right.identifier ?? right.id;
      return leftId.localeCompare(rightId, undefined, { sensitivity: "base" });
    });
  }

  return issuesByDueDate;
}
