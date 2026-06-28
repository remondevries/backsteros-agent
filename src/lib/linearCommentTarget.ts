export type LinearCommentTarget =
  | { kind: "issue"; id: string }
  | { kind: "document"; id: string };

export function linearCommentThreadsPath(target: LinearCommentTarget): string {
  return target.kind === "issue"
    ? `/linear/issues/${encodeURIComponent(target.id)}/comment-threads`
    : `/linear/documents/${encodeURIComponent(target.id)}/comment-threads`;
}

export function linearCommentThreadPath(target: LinearCommentTarget, threadId: string): string {
  return `${linearCommentThreadsPath(target)}/${encodeURIComponent(threadId)}`;
}

export function linearCommentThreadStorageKey(target: LinearCommentTarget): string {
  return target.kind === "issue"
    ? `backsteros.linearIssueThread.${target.id}`
    : `backsteros.linearDocumentThread.${target.id}`;
}
