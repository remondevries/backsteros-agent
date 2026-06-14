import type { LinearComment } from "../../lib/api";
import type {
  LinearAgentActivityContent,
  LinearAgentSessionSnapshot,
} from "../../lib/linearAgentSessionTypes";

export type {
  LinearAgentActivity,
  LinearAgentActivityContent,
  LinearAgentPlanStep,
  LinearAgentSessionSnapshot,
} from "../../lib/linearAgentSessionTypes";

export const DEFAULT_LINEAR_AGENT_STATUS_LABEL = "Thinking…";

export function resolveLinearAgentSessionId(
  comments: ReadonlyArray<Pick<LinearComment, "id" | "parentId" | "createdAt" | "agentSessionId">>,
  threadId: string,
): string | null {
  const threadComments = comments.filter(
    (comment) => comment.id === threadId || comment.parentId === threadId,
  );

  const sorted = [...threadComments].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt);
    const rightTime = Date.parse(right.createdAt);
    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0;
    if (Number.isNaN(leftTime)) return 1;
    if (Number.isNaN(rightTime)) return -1;
    return rightTime - leftTime;
  });

  for (const comment of sorted) {
    const sessionId = comment.agentSessionId?.trim();
    if (sessionId) return sessionId;
  }

  return null;
}

export function sanitizeLinearAgentStatusText(text: string): string {
  const firstLine = text.split("\n")[0] ?? text;
  return firstLine
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateLinearAgentStatusLabel(text: string, maxLength = 120): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

function labelFromActivityContent(content: LinearAgentActivityContent): string | null {
  switch (content.type) {
    case "action": {
      if (content.result?.trim()) return null;
      const action = content.action.trim() || "Working";
      const parameter = content.parameter?.trim();
      return parameter ? `${action} · ${parameter}` : action;
    }
    case "thought": {
      const body = sanitizeLinearAgentStatusText(content.body);
      return body || null;
    }
    case "error": {
      const body = sanitizeLinearAgentStatusText(content.body);
      return body || "Something went wrong";
    }
    case "elicitation": {
      const body = sanitizeLinearAgentStatusText(content.body);
      return body || null;
    }
    case "response":
    case "prompt":
    case "unknown":
      return null;
  }
}

export function pickLinearAgentStatusLabel(
  snapshot: LinearAgentSessionSnapshot | null | undefined,
): string {
  if (!snapshot) return DEFAULT_LINEAR_AGENT_STATUS_LABEL;

  const inProgressPlan = snapshot.plan.find((step) => step.status === "inProgress");
  if (inProgressPlan?.content.trim()) {
    return truncateLinearAgentStatusLabel(
      sanitizeLinearAgentStatusText(inProgressPlan.content),
    );
  }

  const activities = [...snapshot.activities].sort((left, right) => {
    const leftTime = Date.parse(left.updatedAt);
    const rightTime = Date.parse(right.updatedAt);
    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0;
    if (Number.isNaN(leftTime)) return 1;
    if (Number.isNaN(rightTime)) return -1;
    return rightTime - leftTime;
  });

  for (const activity of activities) {
    const label = labelFromActivityContent(activity.content);
    if (label) {
      return truncateLinearAgentStatusLabel(label);
    }
  }

  if (snapshot.summary?.trim()) {
    return truncateLinearAgentStatusLabel(sanitizeLinearAgentStatusText(snapshot.summary));
  }

  return DEFAULT_LINEAR_AGENT_STATUS_LABEL;
}
