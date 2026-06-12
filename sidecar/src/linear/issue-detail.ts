import { linearGraphqlRequest } from "./graphql.ts";

export type LinearIssueDetail = {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  url: string;
  status: string;
  stateType?: string;
  priority: number;
  priorityLabel: string;
  assigneeName: string | null;
  dueDate: string | null;
  projectName: string | null;
};

type GraphqlIssueDetailResponse = {
  issue?: {
    id?: string | null;
    identifier?: string | null;
    title?: string | null;
    description?: string | null;
    url?: string | null;
    dueDate?: string | null;
    priority?: number | null;
    priorityLabel?: string | null;
    state?: { name?: string | null; type?: string | null } | null;
    assignee?: { name?: string | null } | null;
    project?: { name?: string | null } | null;
  } | null;
};

const ISSUE_DETAIL_QUERY = `
  query BacksterIssueDetail($issueId: String!) {
    issue(id: $issueId) {
      id
      identifier
      title
      description
      url
      dueDate
      priority
      priorityLabel
      state { name type }
      assignee { name }
      project { name }
    }
  }
`;

export async function fetchLinearIssueDetail(issueId: string): Promise<LinearIssueDetail | null> {
  const id = issueId.trim();
  if (!id) return null;

  const response = await linearGraphqlRequest<GraphqlIssueDetailResponse>(ISSUE_DETAIL_QUERY, {
    issueId: id,
  });

  const issue = response.issue;
  if (!issue?.id?.trim() || !issue.identifier?.trim()) return null;

  return {
    id: issue.id.trim(),
    identifier: issue.identifier.trim(),
    title: (issue.title ?? "Untitled").trim() || "Untitled",
    description: typeof issue.description === "string" ? issue.description : null,
    url: (issue.url ?? `https://linear.app/issue/${issue.identifier}`).trim(),
    status: (issue.state?.name ?? "Unknown").trim() || "Unknown",
    stateType: (issue.state?.type ?? "").trim() || undefined,
    priority: issue.priority ?? 0,
    priorityLabel: (issue.priorityLabel ?? "").trim(),
    assigneeName: (issue.assignee?.name ?? "").trim() || null,
    dueDate: issue.dueDate ?? null,
    projectName: (issue.project?.name ?? "").trim() || null,
  };
}
