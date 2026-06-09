import { formatDateInTimezone, resolveTodayDailyNoteInfo } from "./daily-note.ts";
import { getLinearApiKey } from "./config.ts";
import { enrichLinearResult, filterOpenLinearIssues } from "./enrichers/linear.ts";
import { loadUserTimezone } from "./context/profile.ts";
import type { LinearIssueEntity } from "./types.ts";

export const LEGACY_MORNING_REVIEW_ACTION_ID = "morning-review";

export const GOOD_MORNING_ACTION_ID = "good-morning";

/** @deprecated Use {@link GOOD_MORNING_ACTION_ID} */
export const MORNING_REVIEW_ACTION_ID = GOOD_MORNING_ACTION_ID;

const LINEAR_GRAPHQL_URL = "https://api.linear.app/graphql";
const PAGE_SIZE = 50;
const MAX_ISSUES = 200;

const ISSUES_DUE_TODAY_QUERY = `
  query IssuesDueToday($dueDate: TimelessDateOrDuration!, $after: String) {
    issues(
      filter: {
        dueDate: { eq: $dueDate }
      }
      first: ${PAGE_SIZE}
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

const MORNING_REVIEW_ISSUES_QUERY = `
  query MorningReviewIssues($dueDate: TimelessDateOrDuration!, $after: String) {
    issues(
      filter: {
        dueDate: { eq: $dueDate }
        state: { type: { nin: ["completed", "canceled"] } }
      }
      first: ${PAGE_SIZE}
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

interface GraphqlIssueNode {
  id: string;
  identifier?: string;
  title?: string;
  priority?: number;
  dueDate?: string;
  url?: string;
  state?: { name?: string; type?: string; color?: string };
  assignee?: { id?: string; displayName?: string; avatarUrl?: string };
  project?: { name?: string };
}

interface GraphqlIssuesPage {
  nodes: GraphqlIssueNode[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
}

async function linearGraphqlRequest<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const apiKey = getLinearApiKey();
  if (!apiKey) {
    throw new Error("LINEAR_API_KEY is not configured");
  }

  const response = await fetch(LINEAR_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const body = (await response.json()) as {
    data?: T;
    errors?: Array<{ message?: string }>;
  };

  if (!response.ok || body.errors?.length) {
    const detail = body.errors
      ?.map((error) => error.message ?? "Unknown error")
      .join("; ");
    throw new Error(detail ?? `Linear API request failed (${response.status})`);
  }

  if (!body.data) {
    throw new Error("Linear API returned no data");
  }

  return body.data;
}

export function resolveMorningReviewDueDate(
  timezone = loadUserTimezone(),
  now = new Date(),
): string {
  return formatDateInTimezone(timezone, now);
}

export function resolveTomorrowDueDate(
  timezone = loadUserTimezone(),
  now = new Date(),
): string {
  const today = resolveMorningReviewDueDate(timezone, now);
  const [year, month, day] = today.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + 1, 12, 0, 0));
  return formatDateInTimezone(timezone, shifted);
}

const ISSUE_UPDATE_MUTATION = `
  mutation GoodNightIssueUpdate($id: String!, $dueDate: TimelessDate) {
    issueUpdate(id: $id, input: { dueDate: $dueDate }) {
      success
      issue {
        id
        identifier
        dueDate
      }
    }
  }
`;

async function updateLinearIssueDueDate(issueId: string, dueDate: string): Promise<void> {
  const data = await linearGraphqlRequest<{
    issueUpdate: { success: boolean; issue?: { id: string } | null };
  }>(ISSUE_UPDATE_MUTATION, { id: issueId, dueDate });

  if (!data.issueUpdate.success) {
    throw new Error(`Linear did not update issue ${issueId}`);
  }
}

export interface MoveIssuesToTomorrowResult {
  moved: LinearIssueEntity[];
  failed: Array<{ issue: LinearIssueEntity; error: string }>;
  tomorrowDate: string;
  fetchedCount: number;
}

const ISSUES_COMPLETED_DUE_TODAY_QUERY = `
  query IssuesCompletedDueToday($dueDate: TimelessDateOrDuration!, $after: String) {
    issues(
      filter: {
        dueDate: { eq: $dueDate }
        state: { type: { eq: "completed" } }
      }
      first: ${PAGE_SIZE}
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

export async function fetchIssuesCompletedToday(options: {
  timezone?: string;
  now?: Date;
} = {}): Promise<{ count: number; issues: LinearIssueEntity[] }> {
  const timezone = options.timezone ?? loadUserTimezone();
  const dueDate = resolveMorningReviewDueDate(timezone, options.now);

  const nodes: GraphqlIssueNode[] = [];
  let after: string | null = null;

  while (nodes.length < MAX_ISSUES) {
    const data = await linearGraphqlRequest<{ issues: GraphqlIssuesPage }>(
      ISSUES_COMPLETED_DUE_TODAY_QUERY,
      { dueDate, after },
    );

    const page = data.issues;
    nodes.push(...page.nodes);

    if (!page.pageInfo.hasNextPage || !page.pageInfo.endCursor) {
      break;
    }

    after = page.pageInfo.endCursor;
  }

  const structured = await enrichLinearResult(
    { nodes: nodes.slice(0, MAX_ISSUES) },
    undefined,
    undefined,
    { includeCompleted: true },
  );
  if (structured?.type !== "linear_issues") {
    return { count: 0, issues: [] };
  }

  const issues = structured.items.filter(
    (issue) => issue.stateType?.trim().toLowerCase() === "completed",
  );
  return { count: issues.length, issues };
}

export async function moveIssuesDueTodayToTomorrow(options: {
  timezone?: string;
  now?: Date;
} = {}): Promise<MoveIssuesToTomorrowResult> {
  const timezone = options.timezone ?? loadUserTimezone();
  const tomorrowDate = resolveTomorrowDueDate(timezone, options.now);
  const issues = await fetchIssuesDueToday({ timezone, now: options.now });

  if (issues.length === 0) {
    return { moved: [], failed: [], tomorrowDate, fetchedCount: 0 };
  }

  const moved: LinearIssueEntity[] = [];
  const failed: MoveIssuesToTomorrowResult["failed"] = [];

  const results = await Promise.allSettled(
    issues.map(async (issue) => {
      await updateLinearIssueDueDate(issue.id, tomorrowDate);
      return { ...issue, dueDate: tomorrowDate };
    }),
  );

  for (let index = 0; index < results.length; index += 1) {
    const result = results[index];
    const issue = issues[index];
    if (!issue || !result) continue;

    if (result.status === "fulfilled") {
      moved.push(result.value);
    } else {
      failed.push({
        issue,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  }

  return { moved, failed, tomorrowDate, fetchedCount: issues.length };
}

export async function fetchIssuesDueToday(options: {
  timezone?: string;
  now?: Date;
} = {}): Promise<LinearIssueEntity[]> {
  const timezone = options.timezone ?? loadUserTimezone();
  const dueDate = resolveMorningReviewDueDate(timezone, options.now);

  const nodes: GraphqlIssueNode[] = [];
  let after: string | null = null;

  while (nodes.length < MAX_ISSUES) {
    const data = await linearGraphqlRequest<{ issues: GraphqlIssuesPage }>(
      MORNING_REVIEW_ISSUES_QUERY,
      { dueDate, after },
    );

    const page = data.issues;
    nodes.push(...page.nodes);

    if (!page.pageInfo.hasNextPage || !page.pageInfo.endCursor) {
      break;
    }

    after = page.pageInfo.endCursor;
  }

  const structured = await enrichLinearResult({ nodes: nodes.slice(0, MAX_ISSUES) });
  if (structured?.type !== "linear_issues") {
    return [];
  }

  return filterOpenLinearIssues(structured.items);
}

export async function fetchAllIssuesDueToday(options: {
  timezone?: string;
  now?: Date;
} = {}): Promise<LinearIssueEntity[]> {
  const timezone = options.timezone ?? loadUserTimezone();
  const dueDate = resolveMorningReviewDueDate(timezone, options.now);

  const nodes: GraphqlIssueNode[] = [];
  let after: string | null = null;

  while (nodes.length < MAX_ISSUES) {
    const data = await linearGraphqlRequest<{ issues: GraphqlIssuesPage }>(
      ISSUES_DUE_TODAY_QUERY,
      { dueDate, after },
    );

    const page = data.issues;
    nodes.push(...page.nodes);

    if (!page.pageInfo.hasNextPage || !page.pageInfo.endCursor) {
      break;
    }

    after = page.pageInfo.endCursor;
  }

  const structured = await enrichLinearResult(
    { nodes: nodes.slice(0, MAX_ISSUES) },
    undefined,
    undefined,
    { includeCompleted: true },
  );
  if (structured?.type !== "linear_issues") {
    return [];
  }

  return structured.items;
}

export function morningReviewLinearContext(issueCount: number, dueDate: string): string {
  return `[Good morning — Linear]
${issueCount} issue(s) due ${dueDate} are preloaded in the run UI (open states only; completed/canceled excluded).
Summarize calendar and Whoop for today and reference that preloaded list.
Do not call Linear MCP to re-fetch unless the user asks.`;
}

export function isMorningReviewQuickAction(quickActionId?: string): boolean {
  return (
    quickActionId === GOOD_MORNING_ACTION_ID ||
    quickActionId === LEGACY_MORNING_REVIEW_ACTION_ID
  );
}

export function morningReviewDateContext(now = new Date()): { dueDate: string; timezone: string } {
  const info = resolveTodayDailyNoteInfo(undefined, now);
  return { dueDate: info.date, timezone: info.timezone };
}
