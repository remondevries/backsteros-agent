import type { LinearComment } from "../../lib/api";
import type { ChatMessage } from "../../chat/types";

function formatThreadTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function summarizeThreadBody(body: string): string {
  const normalized = stripLinearAgentPrefix(body).replace(/\s+/g, " ").trim();
  if (!normalized) return "Empty thread";
  if (normalized.length <= 120) return normalized;
  return `${normalized.slice(0, 117)}…`;
}

export function stripLinearAgentPrefix(body: string): string {
  return body.replace(/^@linear\s*/i, "").trim();
}

export function linearCommentToChatMessage(
  comment: LinearComment,
  viewerId: string | null,
): ChatMessage {
  const isUser = Boolean(viewerId && comment.author.id === viewerId);

  return {
    id: comment.id,
    role: isUser ? "user" : "assistant",
    text: stripLinearAgentPrefix(comment.body),
    createdAt: new Date(comment.createdAt).getTime(),
  };
}

export function formatLinearThreadCardTime(value: string): string {
  return formatThreadTimestamp(value);
}

export { summarizeThreadBody };
