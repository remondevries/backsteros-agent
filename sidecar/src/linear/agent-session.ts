import { linearGraphqlRequest } from "./graphql.ts";

export type LinearAgentPlanStep = {
  content: string;
  status: "pending" | "inProgress" | "completed" | "canceled";
};

export type LinearAgentActivityContent =
  | { type: "thought"; body: string }
  | { type: "action"; action: string; parameter: string | null; result: string | null }
  | { type: "response"; body: string }
  | { type: "elicitation"; body: string }
  | { type: "error"; body: string }
  | { type: "prompt"; body: string }
  | { type: "unknown" };

export type LinearAgentActivity = {
  updatedAt: string;
  ephemeral: boolean;
  content: LinearAgentActivityContent;
};

export type LinearAgentSessionSnapshot = {
  id: string;
  status: string | null;
  summary: string | null;
  plan: LinearAgentPlanStep[];
  activities: LinearAgentActivity[];
};

type GraphqlActivityContent = {
  __typename?: string | null;
  type?: string | null;
  body?: string | null;
  action?: string | null;
  parameter?: string | null;
  result?: string | null;
};

type GraphqlActivityNode = {
  updatedAt?: string | null;
  ephemeral?: boolean | null;
  content?: GraphqlActivityContent | null;
};

const AGENT_SESSION_QUERY = `
  query BacksterAgentSession($id: String!) {
    agentSession(id: $id) {
      id
      status
      summary
      plan
      activities(last: 20, orderBy: updatedAt) {
        nodes {
          updatedAt
          ephemeral
          content {
            __typename
            ... on AgentActivityThoughtContent { body type }
            ... on AgentActivityActionContent { action parameter result type }
            ... on AgentActivityResponseContent { body type }
            ... on AgentActivityElicitationContent { body type }
            ... on AgentActivityErrorContent { body type }
            ... on AgentActivityPromptContent { body type }
          }
        }
      }
    }
  }
`;

function normalizePlanStepStatus(
  value: unknown,
): LinearAgentPlanStep["status"] | null {
  if (value === "pending" || value === "inProgress" || value === "completed" || value === "canceled") {
    return value;
  }
  return null;
}

function normalizePlan(plan: unknown): LinearAgentPlanStep[] {
  if (!Array.isArray(plan)) return [];

  const steps: LinearAgentPlanStep[] = [];
  for (const item of plan) {
    if (!item || typeof item !== "object") continue;
    const record = item as { content?: unknown; status?: unknown };
    const content = typeof record.content === "string" ? record.content.trim() : "";
    if (!content) continue;
    steps.push({
      content,
      status: normalizePlanStepStatus(record.status) ?? "pending",
    });
  }
  return steps;
}

function normalizeActivityContent(content: GraphqlActivityContent | null | undefined): LinearAgentActivityContent {
  const typename = content?.__typename ?? "";
  const type = typeof content?.type === "string" ? content.type : typename.replace("AgentActivity", "").replace("Content", "").toLowerCase();

  switch (typename) {
    case "AgentActivityThoughtContent":
      return { type: "thought", body: typeof content?.body === "string" ? content.body : "" };
    case "AgentActivityActionContent":
      return {
        type: "action",
        action: typeof content?.action === "string" ? content.action : "Working",
        parameter: typeof content?.parameter === "string" ? content.parameter : null,
        result: typeof content?.result === "string" ? content.result : null,
      };
    case "AgentActivityResponseContent":
      return { type: "response", body: typeof content?.body === "string" ? content.body : "" };
    case "AgentActivityElicitationContent":
      return { type: "elicitation", body: typeof content?.body === "string" ? content.body : "" };
    case "AgentActivityErrorContent":
      return { type: "error", body: typeof content?.body === "string" ? content.body : "" };
    case "AgentActivityPromptContent":
      return { type: "prompt", body: typeof content?.body === "string" ? content.body : "" };
    default:
      if (type === "thought" && typeof content?.body === "string") {
        return { type: "thought", body: content.body };
      }
      if (type === "action") {
        return {
          type: "action",
          action: typeof content?.action === "string" ? content.action : "Working",
          parameter: typeof content?.parameter === "string" ? content.parameter : null,
          result: typeof content?.result === "string" ? content.result : null,
        };
      }
      return { type: "unknown" };
  }
}

function normalizeActivities(nodes: GraphqlActivityNode[] | null | undefined): LinearAgentActivity[] {
  return (nodes ?? [])
    .map((node) => {
      const updatedAt = (node.updatedAt ?? "").trim();
      if (!updatedAt) return null;
      return {
        updatedAt,
        ephemeral: Boolean(node.ephemeral),
        content: normalizeActivityContent(node.content),
      } satisfies LinearAgentActivity;
    })
    .filter((activity): activity is LinearAgentActivity => activity != null);
}

export async function fetchLinearAgentSession(
  sessionId: string,
): Promise<LinearAgentSessionSnapshot | null> {
  const id = sessionId.trim();
  if (!id) return null;

  const response = await linearGraphqlRequest<{
    agentSession?: {
      id?: string | null;
      status?: string | null;
      summary?: string | null;
      plan?: unknown;
      activities?: { nodes?: GraphqlActivityNode[] | null } | null;
    } | null;
  }>(AGENT_SESSION_QUERY, { id });

  const session = response.agentSession;
  if (!session?.id?.trim()) return null;

  return {
    id: session.id.trim(),
    status: typeof session.status === "string" ? session.status : null,
    summary: typeof session.summary === "string" ? session.summary : null,
    plan: normalizePlan(session.plan),
    activities: normalizeActivities(session.activities?.nodes),
  };
}
