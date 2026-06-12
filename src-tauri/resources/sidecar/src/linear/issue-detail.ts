import { linearGraphqlRequest } from "./graphql.ts";

export type LinearIssueDetailLabel = {
  id: string;
  name: string;
  color: string;
};

export type LinearIssueWorkflowState = {
  id: string;
  name: string;
  type: string;
};

export type LinearIssueDetail = {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  url: string;
  status: string;
  stateId: string | null;
  stateType?: string;
  statusColor?: string;
  priority: number;
  priorityLabel: string;
  assigneeName: string | null;
  assigneeUsername: string | null;
  assigneeAvatarUrl: string | null;
  dueDate: string | null;
  estimate: number | null;
  branchName: string | null;
  projectId: string | null;
  projectName: string | null;
  labels: LinearIssueDetailLabel[];
  availableLabels: LinearIssueDetailLabel[];
  workflowStates: LinearIssueWorkflowState[];
  teamEstimation: LinearTeamEstimationSettings | null;
};

export type LinearTeamEstimationSettings = {
  issueEstimationType: string;
  issueEstimationAllowZero: boolean;
  issueEstimationExtended: boolean;
};

export type LinearIssueDetailUpdateInput = {
  stateId?: string;
  priority?: number;
  estimate?: number | null;
  labelIds?: string[];
  description?: string | null;
};

type GraphqlIssueDetailNode = {
  id?: string | null;
  identifier?: string | null;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  dueDate?: string | null;
  estimate?: number | null;
  branchName?: string | null;
  priority?: number | null;
  priorityLabel?: string | null;
  state?: { id?: string | null; name?: string | null; type?: string | null; color?: string | null } | null;
  assignee?: { name?: string | null; displayName?: string | null; avatarUrl?: string | null } | null;
  project?: { id?: string | null; name?: string | null } | null;
  labels?: { nodes?: Array<{ id?: string | null; name?: string | null; color?: string | null } | null> | null } | null;
  team?: {
    states?: {
      nodes?: Array<{ id?: string | null; name?: string | null; type?: string | null } | null> | null;
    } | null;
    labels?: {
      nodes?: Array<{ id?: string | null; name?: string | null; color?: string | null } | null> | null;
    } | null;
    issueEstimationType?: string | null;
    issueEstimationAllowZero?: boolean | null;
    issueEstimationExtended?: boolean | null;
  } | null;
};

type GraphqlIssueDetailResponse = {
  issue?: GraphqlIssueDetailNode | null;
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
      estimate
      branchName
      priority
      priorityLabel
      state { id name type color }
      assignee { name displayName avatarUrl }
      project { id name }
      labels(first: 20) { nodes { id name color } }
      team {
        issueEstimationType
        issueEstimationAllowZero
        issueEstimationExtended
        states {
          nodes { id name type }
        }
        labels(first: 100) {
          nodes { id name color }
        }
      }
    }
  }
`;

function normalizeLabelColor(color: string | null | undefined): string {
  return color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#93A2B6";
}

function linearAssigneeUsername(
  displayName: string | null | undefined,
  name: string | null | undefined,
): string | null {
  const fromDisplay = (displayName ?? "").trim();
  if (fromDisplay) return fromDisplay.toLowerCase();

  const firstName = (name ?? "").trim().split(/\s+/)[0];
  return firstName ? firstName.toLowerCase() : null;
}

function mapIssueLabels(
  nodes:
    | Array<{ id?: string | null; name?: string | null; color?: string | null } | null>
    | null
    | undefined,
): LinearIssueDetailLabel[] {
  const entries = (nodes ?? [])
    .map((entry) => {
      const id = (entry?.id ?? "").trim();
      const name = (entry?.name ?? "").trim();
      if (!id || !name) return null;
      return { id, name, color: normalizeLabelColor(entry?.color) };
    })
    .filter((entry): entry is LinearIssueDetailLabel => Boolean(entry));

  return Array.from(new Map(entries.map((entry) => [entry.id, entry])).values());
}

function mapLinearIssueDetail(issue: GraphqlIssueDetailNode | null | undefined): LinearIssueDetail | null {
  if (!issue?.id?.trim() || !issue.identifier?.trim()) return null;

  const labels = mapIssueLabels(issue.labels?.nodes);
  const availableLabels = mapIssueLabels(issue.team?.labels?.nodes);

  const workflowStates = (issue.team?.states?.nodes ?? [])
    .map((entry) => {
      const id = (entry?.id ?? "").trim();
      const name = (entry?.name ?? "").trim();
      const type = (entry?.type ?? "").trim();
      if (!id || !name || !type) return null;
      return { id, name, type } satisfies LinearIssueWorkflowState;
    })
    .filter((entry): entry is LinearIssueWorkflowState => Boolean(entry));

  const estimationType = (issue.team?.issueEstimationType ?? "").trim();
  const teamEstimation = estimationType
    ? {
        issueEstimationType: estimationType,
        issueEstimationAllowZero: Boolean(issue.team?.issueEstimationAllowZero),
        issueEstimationExtended: Boolean(issue.team?.issueEstimationExtended),
      }
    : null;

  return {
    id: issue.id.trim(),
    identifier: issue.identifier.trim(),
    title: (issue.title ?? "Untitled").trim() || "Untitled",
    description: typeof issue.description === "string" ? issue.description : null,
    url: (issue.url ?? `https://linear.app/issue/${issue.identifier}`).trim(),
    status: (issue.state?.name ?? "Unknown").trim() || "Unknown",
    stateId: (issue.state?.id ?? "").trim() || null,
    stateType: (issue.state?.type ?? "").trim() || undefined,
    statusColor: (issue.state?.color ?? "").trim() || undefined,
    priority: issue.priority ?? 0,
    priorityLabel: (issue.priorityLabel ?? "").trim(),
    assigneeName: (issue.assignee?.name ?? "").trim() || null,
    assigneeUsername: linearAssigneeUsername(issue.assignee?.displayName, issue.assignee?.name),
    assigneeAvatarUrl: (issue.assignee?.avatarUrl ?? "").trim() || null,
    dueDate: issue.dueDate ?? null,
    estimate: issue.estimate ?? null,
    branchName: (issue.branchName ?? "").trim() || null,
    projectId: (issue.project?.id ?? "").trim() || null,
    projectName: (issue.project?.name ?? "").trim() || null,
    labels,
    availableLabels,
    workflowStates,
    teamEstimation,
  };
}

export async function fetchLinearIssueDetail(issueId: string): Promise<LinearIssueDetail | null> {
  const id = issueId.trim();
  if (!id) return null;

  const response = await linearGraphqlRequest<GraphqlIssueDetailResponse>(ISSUE_DETAIL_QUERY, {
    issueId: id,
  });

  return mapLinearIssueDetail(response.issue);
}

const ISSUE_UPDATE_MUTATION = `
  mutation BacksterIssueUpdate($issueId: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $issueId, input: $input) {
      success
      issue {
        id
        identifier
        title
        description
        url
        dueDate
        estimate
        branchName
        priority
        priorityLabel
        state { id name type color }
        assignee { name displayName avatarUrl }
        project { id name }
        labels(first: 20) { nodes { id name color } }
        team {
          issueEstimationType
          issueEstimationAllowZero
          issueEstimationExtended
          states {
            nodes { id name type }
          }
          labels(first: 100) {
            nodes { id name color }
          }
        }
      }
    }
  }
`;

export async function updateLinearIssueDetail(
  issueId: string,
  input: LinearIssueDetailUpdateInput,
): Promise<LinearIssueDetail | null> {
  const id = issueId.trim();
  if (!id) return null;

  const payload: LinearIssueDetailUpdateInput = {};
  if (typeof input.stateId === "string") {
    const stateId = input.stateId.trim();
    if (stateId) payload.stateId = stateId;
  }
  if (typeof input.priority === "number" && Number.isFinite(input.priority)) {
    payload.priority = Math.round(input.priority);
  }
  if (input.estimate === null) {
    payload.estimate = null;
  } else if (typeof input.estimate === "number" && Number.isFinite(input.estimate)) {
    payload.estimate = Math.round(input.estimate);
  }
  if (Array.isArray(input.labelIds)) {
    payload.labelIds = Array.from(
      new Set(
        input.labelIds
          .map((labelId) => labelId.trim())
          .filter((labelId) => labelId.length > 0),
      ),
    );
  }
  if (input.description === null) {
    payload.description = null;
  } else if (typeof input.description === "string") {
    payload.description = input.description;
  }
  if (!Object.keys(payload).length) return null;

  const response = await linearGraphqlRequest<{
    issueUpdate?: {
      success?: boolean;
      issue?: GraphqlIssueDetailNode | null;
    } | null;
  }>(ISSUE_UPDATE_MUTATION, {
    issueId: id,
    input: payload,
  });

  if (!response.issueUpdate?.success) {
    throw new Error("Failed to update issue");
  }

  return mapLinearIssueDetail(response.issueUpdate.issue);
}
