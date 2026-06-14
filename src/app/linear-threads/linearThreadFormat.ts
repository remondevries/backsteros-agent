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

export function linearThreadRootBodyForEditing(body: string): string {
  return stripLinearAgentPrefix(body);
}

export function buildLinearThreadRootBodyForSave(
  originalBody: string,
  editedBody: string,
): string {
  const trimmed = editedBody.trim();
  if (!trimmed) return "";
  if (/^@linear\b/i.test(originalBody.trim())) {
    if (/^@linear\b/i.test(trimmed)) return trimmed;
    return `@linear ${trimmed}`;
  }
  return trimmed;
}

export function isLinearAgentThinkingPlaceholder(text: string): boolean {
  const normalized = text.trim().toLowerCase().replace(/…/g, "...");
  return normalized === "thinking..." || normalized === "thinking";
}

export function isLinearAgentComment(
  comment: LinearComment,
  viewerId: string | null,
): boolean {
  return Boolean(viewerId && comment.author.id !== viewerId);
}

function isSubstantiveLinearAgentComment(
  comment: LinearComment,
  viewerId: string | null,
): boolean {
  if (!isLinearAgentComment(comment, viewerId)) return false;
  const text = stripLinearAgentPrefix(comment.body);
  if (!text.trim() || isLinearAgentThinkingPlaceholder(text)) return false;
  return true;
}

export function findNewSubstantiveLinearAgentCommentIds(
  comments: LinearComment[],
  viewerId: string | null,
  baselineSubstantiveAgentCommentIds: ReadonlySet<string>,
): string[] {
  const ids: string[] = [];
  for (const comment of comments) {
    if (!isSubstantiveLinearAgentComment(comment, viewerId)) continue;
    if (!baselineSubstantiveAgentCommentIds.has(comment.id)) {
      ids.push(comment.id);
    }
  }
  return ids;
}

export function hasSubstantiveLinearAgentReply(
  comments: LinearComment[],
  viewerId: string | null,
  baselineSubstantiveAgentCommentIds: ReadonlySet<string>,
): boolean {
  return (
    findNewSubstantiveLinearAgentCommentIds(
      comments,
      viewerId,
      baselineSubstantiveAgentCommentIds,
    ).length > 0
  );
}

export function snapshotSubstantiveLinearAgentCommentIds(
  comments: LinearComment[],
  viewerId: string | null,
): Set<string> {
  return collectSubstantiveAgentCommentIds(comments, viewerId);
}

function collectSubstantiveAgentCommentIds(
  comments: LinearComment[],
  viewerId: string | null,
): Set<string> {
  const ids = new Set<string>();
  for (const comment of comments) {
    if (!isLinearAgentComment(comment, viewerId)) continue;
    const text = stripLinearAgentPrefix(comment.body);
    if (!text.trim() || isLinearAgentThinkingPlaceholder(text)) continue;
    ids.add(comment.id);
  }
  return ids;
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

export function mergeLinearThreadComments(
  comments: LinearComment[],
  incoming: LinearComment,
): LinearComment[] {
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  byId.set(incoming.id, incoming);
  return [...byId.values()].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

export function linearThreadCommentsToChatMessages(
  comments: LinearComment[],
  _threadId: string | null,
  viewerId: string | null,
): ChatMessage[] {
  return comments
    .map((comment) => linearCommentToChatMessage(comment, viewerId))
    .filter(
      (message) =>
        message.text.trim().length > 0 &&
        !(message.role === "assistant" && isLinearAgentThinkingPlaceholder(message.text)),
    )
    .sort((left, right) => left.createdAt - right.createdAt);
}

export function formatLinearThreadCardTime(value: string): string {
  return formatThreadTimestamp(value);
}

export function resolveLinearThreadReplyParentId(
  _comments: ReadonlyArray<Pick<LinearComment, "id" | "parentId">>,
  threadId: string,
): string {
  // Linear only accepts root comments (no parent) as parentId for new replies.
  // Follow-ups in a thread must attach to the thread root, not nested replies.
  return threadId;
}

export { summarizeThreadBody };
