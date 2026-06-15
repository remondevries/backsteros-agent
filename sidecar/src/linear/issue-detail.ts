import { linearGraphqlRequest } from "./graphql.ts";

export type LinearIssueDetailLabel = {
  id: string;
  name: string;
  color: string;
};

export type LinearIssueTeamMember = {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
};

export type LinearIssueWorkflowState = {
  id: string;
  name: string;
  type: string;
  color?: string;
  position?: number;
};

function sortWorkflowStates(states: LinearIssueWorkflowState[]): LinearIssueWorkflowState[] {
  return [...states].sort((left, right) => {
    const leftPosition = Number.isFinite(left.position) ? Number(left.position) : Number.NaN;
    const rightPosition = Number.isFinite(right.position) ? Number(right.position) : Number.NaN;
    if (Number.isFinite(leftPosition) && Number.isFinite(rightPosition) && leftPosition !== rightPosition) {
      return leftPosition - rightPosition;
    }
    if (Number.isFinite(leftPosition) && !Number.isFinite(rightPosition)) return -1;
    if (!Number.isFinite(leftPosition) && Number.isFinite(rightPosition)) return 1;
    return left.name.localeCompare(right.name);
  });
}

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
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeUsername: string | null;
  assigneeAvatarUrl: string | null;
  dueDate: string | null;
  estimate: number | null;
  branchName: string | null;
  teamId: string | null;
  teamName: string | null;
  projectId: string | null;
  projectName: string | null;
  labels: LinearIssueDetailLabel[];
  availableLabels: LinearIssueDetailLabel[];
  workflowStates: LinearIssueWorkflowState[];
  teamMembers: LinearIssueTeamMember[];
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
  title?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  teamId?: string;
  projectId?: string | null;
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
  state?: {
    id?: string | null;
    name?: string | null;
    type?: string | null;
    color?: string | null;
    position?: number | null;
  } | null;
  assignee?: { id?: string | null; name?: string | null; displayName?: string | null; avatarUrl?: string | null } | null;
  project?: { id?: string | null; name?: string | null } | null;
  labels?: { nodes?: Array<{ id?: string | null; name?: string | null; color?: string | null } | null> | null } | null;
  team?: {
    id?: string | null;
    name?: string | null;
    states?: {
      nodes?: Array<{
        id?: string | null;
        name?: string | null;
        type?: string | null;
        color?: string | null;
        position?: number | null;
      } | null> | null;
    } | null;
    labels?: {
      nodes?: Array<{ id?: string | null; name?: string | null; color?: string | null } | null> | null;
    } | null;
    members?: {
      nodes?: Array<{
        id?: string | null;
        name?: string | null;
        displayName?: string | null;
        avatarUrl?: string | null;
      } | null> | null;
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
      state { id name type color position }
      assignee { id name displayName avatarUrl }
      project { id name }
      labels(first: 20) { nodes { id name color } }
      team {
        id
        name
        issueEstimationType
        issueEstimationAllowZero
        issueEstimationExtended
        members(first: 100) {
          nodes { id name displayName avatarUrl }
        }
        states {
          nodes { id name type color position }
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

function mapTeamMembers(
  nodes:
    | Array<{
        id?: string | null;
        name?: string | null;
        displayName?: string | null;
        avatarUrl?: string | null;
      } | null>
    | null
    | undefined,
): LinearIssueTeamMember[] {
  const entries = (nodes ?? [])
    .map((user) => {
      const id = (user?.id ?? "").trim();
      const name = (user?.name ?? "").trim();
      if (!id || !name) return null;
      return {
        id,
        name,
        username: linearAssigneeUsername(user?.displayName, user?.name),
        avatarUrl: (user?.avatarUrl ?? "").trim() || null,
      } satisfies LinearIssueTeamMember;
    })
    .filter((entry): entry is LinearIssueTeamMember => Boolean(entry));

  return Array.from(new Map(entries.map((entry) => [entry.id, entry])).values());
}

function mapLinearIssueDetail(issue: GraphqlIssueDetailNode | null | undefined): LinearIssueDetail | null {
  if (!issue?.id?.trim() || !issue.identifier?.trim()) return null;

  const labels = mapIssueLabels(issue.labels?.nodes);
  const availableLabels = mapIssueLabels(issue.team?.labels?.nodes);

  const workflowStates = sortWorkflowStates(
    (issue.team?.states?.nodes ?? [])
      .map((entry) => {
        const id = (entry?.id ?? "").trim();
        const name = (entry?.name ?? "").trim();
        const type = (entry?.type ?? "").trim();
        if (!id || !name || !type) return null;
        const color = (entry?.color ?? "").trim() || undefined;
        const position = Number.isFinite(entry?.position) ? Number(entry?.position) : undefined;
        return { id, name, type, color, position } satisfies LinearIssueWorkflowState;
      })
      .filter((entry): entry is LinearIssueWorkflowState => Boolean(entry)),
  );

  const teamMembers = mapTeamMembers(issue.team?.members?.nodes);

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
    assigneeId: (issue.assignee?.id ?? "").trim() || null,
    assigneeName: (issue.assignee?.name ?? "").trim() || null,
    assigneeUsername: linearAssigneeUsername(issue.assignee?.displayName, issue.assignee?.name),
    assigneeAvatarUrl: (issue.assignee?.avatarUrl ?? "").trim() || null,
    dueDate: issue.dueDate ?? null,
    estimate: issue.estimate ?? null,
    branchName: (issue.branchName ?? "").trim() || null,
    teamId: (issue.team?.id ?? "").trim() || null,
    teamName: (issue.team?.name ?? "").trim() || null,
    projectId: (issue.project?.id ?? "").trim() || null,
    projectName: (issue.project?.name ?? "").trim() || null,
    labels,
    availableLabels,
    workflowStates,
    teamMembers,
    teamEstimation,
  };
}

export type LinearIssueSubIssue = {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
};

export type LinearIssueLinkedCustomer = {
  id: string;
  name: string;
};

type GraphqlIssueSubIssueNode = {
  id?: string | null;
  identifier?: string | null;
  title?: string | null;
  description?: string | null;
};

type GraphqlIssueCustomerNeedNode = {
  customer?: {
    id?: string | null;
    name?: string | null;
  } | null;
};

type GraphqlIssueSubIssuesResponse = {
  issue?: {
    children?: {
      nodes?: Array<GraphqlIssueSubIssueNode | null> | null;
    } | null;
  } | null;
};

type GraphqlIssueLinkedCustomersResponse = {
  issue?: {
    needs?: {
      nodes?: Array<GraphqlIssueCustomerNeedNode | null> | null;
    } | null;
  } | null;
};

const ISSUE_SUB_ISSUES_QUERY = `
  query BacksterIssueSubIssues($issueId: String!) {
    issue(id: $issueId) {
      children {
        nodes {
          id
          identifier
          title
          description
        }
      }
    }
  }
`;

const ISSUE_LINKED_CUSTOMERS_QUERY = `
  query BacksterIssueLinkedCustomers($issueId: String!) {
    issue(id: $issueId) {
      needs(first: 20) {
        nodes {
          customer {
            id
            name
          }
        }
      }
    }
  }
`;

function mapLinearIssueSubIssue(
  node: GraphqlIssueSubIssueNode | null | undefined,
): LinearIssueSubIssue | null {
  const id = (node?.id ?? "").trim();
  const identifier = (node?.identifier ?? "").trim();
  const title = (node?.title ?? "").trim();
  if (!id || !identifier || !title) return null;
  return {
    id,
    identifier,
    title,
    description: typeof node?.description === "string" ? node.description : null,
  };
}

function mapLinearIssueLinkedCustomers(
  nodes: Array<GraphqlIssueCustomerNeedNode | null> | null | undefined,
): LinearIssueLinkedCustomer[] {
  const byId = new Map<string, LinearIssueLinkedCustomer>();
  for (const node of nodes ?? []) {
    const id = (node?.customer?.id ?? "").trim();
    const name = (node?.customer?.name ?? "").trim();
    if (!id || !name) continue;
    byId.set(id, { id, name });
  }
  return [...byId.values()].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
  );
}

export type LinearIssueContactContext = {
  subIssues: LinearIssueSubIssue[];
  linkedCustomers: LinearIssueLinkedCustomer[];
};

export async function fetchLinearIssueLinkedCustomers(issueId: string): Promise<LinearIssueLinkedCustomer[]> {
  const id = issueId.trim();
  if (!id) return [];

  try {
    const response = await linearGraphqlRequest<GraphqlIssueLinkedCustomersResponse>(
      ISSUE_LINKED_CUSTOMERS_QUERY,
      { issueId: id },
    );
    return mapLinearIssueLinkedCustomers(response.issue?.needs?.nodes);
  } catch {
    return [];
  }
}

export async function fetchLinearIssueContactContext(issueId: string): Promise<LinearIssueContactContext> {
  const id = issueId.trim();
  if (!id) return { subIssues: [], linkedCustomers: [] };

  const response = await linearGraphqlRequest<GraphqlIssueSubIssuesResponse>(ISSUE_SUB_ISSUES_QUERY, {
    issueId: id,
  });

  const subIssues = (response.issue?.children?.nodes ?? [])
    .map((node) => mapLinearIssueSubIssue(node))
    .filter((entry): entry is LinearIssueSubIssue => Boolean(entry))
    .sort((left, right) =>
      left.title.localeCompare(right.title, undefined, { sensitivity: "base" }),
    );

  const linkedCustomers = await fetchLinearIssueLinkedCustomers(id);

  return { subIssues, linkedCustomers };
}

export async function fetchLinearIssueSubIssues(issueId: string): Promise<LinearIssueSubIssue[]> {
  const context = await fetchLinearIssueContactContext(issueId);
  return context.subIssues;
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
        state { id name type color position }
        assignee { id name displayName avatarUrl }
        project { id name }
        labels(first: 20) { nodes { id name color } }
        team {
          id
          name
          issueEstimationType
          issueEstimationAllowZero
          issueEstimationExtended
          members(first: 100) {
            nodes { id name displayName avatarUrl }
          }
          states {
            nodes { id name type color position }
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
  if (typeof input.title === "string") {
    const title = input.title.trim();
    if (title) payload.title = title;
  }
  if (input.assigneeId === null) {
    payload.assigneeId = null;
  } else if (typeof input.assigneeId === "string") {
    const assigneeId = input.assigneeId.trim();
    if (assigneeId) payload.assigneeId = assigneeId;
  }
  if ("dueDate" in input) {
    if (input.dueDate === null) {
      payload.dueDate = null;
    } else if (typeof input.dueDate === "string") {
      const dueDate = input.dueDate.trim().slice(0, 10);
      if (dueDate) payload.dueDate = dueDate;
    }
  }
  if (typeof input.teamId === "string") {
    const teamId = input.teamId.trim();
    if (teamId) payload.teamId = teamId;
  }
  if ("projectId" in input) {
    if (input.projectId === null) {
      payload.projectId = null;
    } else if (typeof input.projectId === "string") {
      const projectId = input.projectId.trim();
      payload.projectId = projectId || null;
    }
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
