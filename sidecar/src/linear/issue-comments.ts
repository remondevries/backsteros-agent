import { fetchLinearViewerId } from "./project-context.ts";
import { linearGraphqlRequest } from "./graphql.ts";

export type LinearCommentAuthor = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type LinearComment = {
  id: string;
  body: string;
  createdAt: string;
  author: LinearCommentAuthor;
  parentId: string | null;
  agentSessionId: string | null;
};

export type LinearCommentThreadSummary = {
  id: string;
  body: string;
  createdAt: string;
  author: LinearCommentAuthor;
};

type GraphqlCommentNode = {
  id?: string | null;
  body?: string | null;
  createdAt?: string | null;
  parent?: { id?: string | null } | null;
  agentSession?: { id?: string | null } | null;
  user?: {
    id?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
  } | null;
};

const ISSUE_COMMENTS_QUERY = `
  query BacksterIssueComments($issueId: String!) {
    issue(id: $issueId) {
      comments(first: 250) {
        nodes {
          id
          body
          createdAt
          parent { id }
          agentSession { id }
          user { id name avatarUrl }
        }
      }
    }
  }
`;

const COMMENT_CREATE_MUTATION = `
  mutation BacksterCommentCreate($input: CommentCreateInput!) {
    commentCreate(input: $input) {
      success
      comment {
        id
        body
        createdAt
        parent { id }
        user { id name avatarUrl }
      }
    }
  }
`;

const COMMENT_UPDATE_MUTATION = `
  mutation BacksterCommentUpdate($id: String!, $input: CommentUpdateInput!) {
    commentUpdate(id: $id, input: $input) {
      success
      comment {
        id
        body
        createdAt
        parent { id }
        user { id name avatarUrl }
      }
    }
  }
`;

const COMMENT_DELETE_MUTATION = `
  mutation BacksterCommentDelete($id: String!) {
    commentDelete(id: $id) {
      success
    }
  }
`;

function normalizeAuthor(user: GraphqlCommentNode["user"]): LinearCommentAuthor {
  return {
    id: (user?.id ?? "").trim(),
    name: (user?.name ?? "Unknown").trim() || "Unknown",
    avatarUrl: (user?.avatarUrl ?? "").trim() || null,
  };
}

function normalizeComment(node: GraphqlCommentNode): LinearComment | null {
  const id = node.id?.trim();
  if (!id) return null;

  return {
    id,
    body: typeof node.body === "string" ? node.body : "",
    createdAt: (node.createdAt ?? "").trim(),
    author: normalizeAuthor(node.user),
    parentId: (node.parent?.id ?? "").trim() || null,
    agentSessionId: (node.agentSession?.id ?? "").trim() || null,
  };
}

function sortByCreatedAtAsc<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt);
    const rightTime = Date.parse(right.createdAt);
    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0;
    if (Number.isNaN(leftTime)) return 1;
    if (Number.isNaN(rightTime)) return -1;
    return leftTime - rightTime;
  });
}

function sortByCreatedAtDesc<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt);
    const rightTime = Date.parse(right.createdAt);
    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0;
    if (Number.isNaN(leftTime)) return 1;
    if (Number.isNaN(rightTime)) return -1;
    return rightTime - leftTime;
  });
}

async function fetchIssueComments(issueId: string): Promise<LinearComment[]> {
  const response = await linearGraphqlRequest<{
    issue?: { comments?: { nodes?: GraphqlCommentNode[] } } | null;
  }>(ISSUE_COMMENTS_QUERY, { issueId });

  return (response.issue?.comments?.nodes ?? [])
    .map((node) => normalizeComment(node))
    .filter((comment): comment is LinearComment => comment != null);
}

function collectThreadComments(
  comments: LinearComment[],
  threadId: string,
): LinearComment[] {
  const root = comments.find((comment) => comment.id === threadId && !comment.parentId);
  if (!root) return [];

  const collected = new Map<string, LinearComment>([[root.id, root]]);
  let expanded = true;

  while (expanded) {
    expanded = false;
    for (const comment of comments) {
      const parentId = comment.parentId?.trim();
      if (!parentId || collected.has(comment.id)) continue;
      if (!collected.has(parentId)) continue;
      collected.set(comment.id, comment);
      expanded = true;
    }
  }

  return sortByCreatedAtAsc([...collected.values()]);
}

export async function fetchLinearIssueCommentThreads(
  issueId: string,
): Promise<LinearCommentThreadSummary[]> {
  const comments = await fetchIssueComments(issueId);
  const threads = comments
    .filter((comment) => !comment.parentId)
    .map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      author: comment.author,
    }));

  return sortByCreatedAtDesc(threads);
}

export async function fetchLinearIssueCommentThread(
  issueId: string,
  threadId: string,
): Promise<{ viewerId: string | null; comments: LinearComment[] }> {
  const [comments, viewerId] = await Promise.all([
    fetchIssueComments(issueId),
    fetchLinearViewerId().catch(() => undefined),
  ]);

  return {
    viewerId: viewerId ?? null,
    comments: collectThreadComments(comments, threadId),
  };
}

export async function createLinearIssueComment(
  issueId: string,
  body: string,
  parentId?: string | null,
): Promise<LinearComment> {
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    throw new Error("Comment body is required");
  }

  const input: Record<string, string> = {
    issueId: issueId.trim(),
    body: trimmedBody,
  };

  const parent = parentId?.trim();
  if (parent) {
    input.parentId = parent;
  }

  const response = await linearGraphqlRequest<{
    commentCreate?: {
      success?: boolean;
      comment?: GraphqlCommentNode | null;
    } | null;
  }>(COMMENT_CREATE_MUTATION, { input });

  if (!response.commentCreate?.success) {
    throw new Error("Linear rejected the comment");
  }

  const comment = normalizeComment(response.commentCreate.comment ?? {});
  if (!comment) {
    throw new Error("Linear returned no comment");
  }

  return comment;
}

export async function updateLinearIssueComment(
  commentId: string,
  body: string,
): Promise<LinearComment> {
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    throw new Error("Comment body is required");
  }

  const response = await linearGraphqlRequest<{
    commentUpdate?: {
      success?: boolean;
      comment?: GraphqlCommentNode | null;
    } | null;
  }>(COMMENT_UPDATE_MUTATION, {
    id: commentId.trim(),
    input: { body: trimmedBody },
  });

  if (!response.commentUpdate?.success) {
    throw new Error("Linear rejected the comment update");
  }

  const comment = normalizeComment(response.commentUpdate.comment ?? {});
  if (!comment) {
    throw new Error("Linear returned no comment");
  }

  return comment;
}

export async function deleteLinearIssueComment(commentId: string): Promise<void> {
  const response = await linearGraphqlRequest<{
    commentDelete?: { success?: boolean } | null;
  }>(COMMENT_DELETE_MUTATION, { id: commentId.trim() });

  if (!response.commentDelete?.success) {
    throw new Error("Linear rejected the comment deletion");
  }
}

export async function updateLinearIssueCommentThreadRoot(
  issueId: string,
  threadId: string,
  body: string,
): Promise<LinearComment> {
  const comments = await fetchIssueComments(issueId);
  const threadComments = collectThreadComments(comments, threadId);
  const root = threadComments[0];
  if (!root) {
    throw new Error("Thread not found");
  }

  return updateLinearIssueComment(root.id, body);
}

export async function deleteLinearIssueCommentThread(
  issueId: string,
  threadId: string,
): Promise<void> {
  const comments = await fetchIssueComments(issueId);
  const threadComments = collectThreadComments(comments, threadId);
  if (threadComments.length === 0) {
    throw new Error("Thread not found");
  }

  const toDelete = [...threadComments].reverse();
  for (const comment of toDelete) {
    await deleteLinearIssueComment(comment.id);
  }
}

export const LINEAR_AGENT_THREAD_PREFIX = "@linear";

export function buildLinearAgentThreadBody(userBody?: string | null): string {
  const trimmed = userBody?.trim() ?? "";
  if (!trimmed) return LINEAR_AGENT_THREAD_PREFIX;
  if (/^@linear\b/i.test(trimmed)) return trimmed;
  return `${LINEAR_AGENT_THREAD_PREFIX} ${trimmed}`;
}

export async function createLinearAgentThread(
  issueId: string,
  userBody?: string | null,
): Promise<LinearComment> {
  return createLinearIssueComment(issueId, buildLinearAgentThreadBody(userBody));
}

const DOCUMENT_COMMENTS_QUERY = `
  query BacksterDocumentComments($documentId: String!) {
    document(id: $documentId) {
      documentContentId
      comments(first: 250) {
        nodes {
          id
          body
          createdAt
          parent { id }
          agentSession { id }
          user { id name avatarUrl }
        }
      }
    }
  }
`;

const DOCUMENT_CONTENT_ID_QUERY = `
  query BacksterDocumentContentId($documentId: String!) {
    document(id: $documentId) {
      documentContentId
    }
  }
`;

async function fetchDocumentContentId(documentId: string): Promise<string> {
  const response = await linearGraphqlRequest<{
    document?: { documentContentId?: string | null } | null;
  }>(DOCUMENT_CONTENT_ID_QUERY, { documentId });

  const contentId = response.document?.documentContentId?.trim();
  if (!contentId) {
    throw new Error("Document content not found");
  }
  return contentId;
}

async function fetchDocumentComments(documentId: string): Promise<LinearComment[]> {
  const response = await linearGraphqlRequest<{
    document?: { comments?: { nodes?: GraphqlCommentNode[] } } | null;
  }>(DOCUMENT_COMMENTS_QUERY, { documentId });

  return (response.document?.comments?.nodes ?? [])
    .map((node) => normalizeComment(node))
    .filter((comment): comment is LinearComment => comment != null);
}

export async function fetchLinearDocumentCommentThreads(
  documentId: string,
): Promise<LinearCommentThreadSummary[]> {
  const comments = await fetchDocumentComments(documentId);
  const threads = comments
    .filter((comment) => !comment.parentId)
    .map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      author: comment.author,
    }));

  return sortByCreatedAtDesc(threads);
}

export async function fetchLinearDocumentCommentThread(
  documentId: string,
  threadId: string,
): Promise<{ viewerId: string | null; comments: LinearComment[] }> {
  const [comments, viewerId] = await Promise.all([
    fetchDocumentComments(documentId),
    fetchLinearViewerId().catch(() => undefined),
  ]);

  return {
    viewerId: viewerId ?? null,
    comments: collectThreadComments(comments, threadId),
  };
}

export async function createLinearDocumentComment(
  documentId: string,
  body: string,
  parentId?: string | null,
): Promise<LinearComment> {
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    throw new Error("Comment body is required");
  }

  const documentContentId = await fetchDocumentContentId(documentId);
  const input: Record<string, string> = {
    documentContentId,
    body: trimmedBody,
  };

  const parent = parentId?.trim();
  if (parent) {
    input.parentId = parent;
  }

  const response = await linearGraphqlRequest<{
    commentCreate?: {
      success?: boolean;
      comment?: GraphqlCommentNode | null;
    } | null;
  }>(COMMENT_CREATE_MUTATION, { input });

  if (!response.commentCreate?.success) {
    throw new Error("Linear rejected the comment");
  }

  const comment = normalizeComment(response.commentCreate.comment ?? {});
  if (!comment) {
    throw new Error("Linear returned no comment");
  }

  return comment;
}

export async function updateLinearDocumentCommentThreadRoot(
  documentId: string,
  threadId: string,
  body: string,
): Promise<LinearComment> {
  const comments = await fetchDocumentComments(documentId);
  const threadComments = collectThreadComments(comments, threadId);
  const root = threadComments[0];
  if (!root) {
    throw new Error("Thread not found");
  }

  return updateLinearIssueComment(root.id, body);
}

export async function deleteLinearDocumentCommentThread(
  documentId: string,
  threadId: string,
): Promise<void> {
  const comments = await fetchDocumentComments(documentId);
  const threadComments = collectThreadComments(comments, threadId);
  if (threadComments.length === 0) {
    throw new Error("Thread not found");
  }

  const toDelete = [...threadComments].reverse();
  for (const comment of toDelete) {
    await deleteLinearIssueComment(comment.id);
  }
}

export async function createLinearAgentDocumentThread(
  documentId: string,
  userBody?: string | null,
): Promise<LinearComment> {
  return createLinearDocumentComment(documentId, buildLinearAgentThreadBody(userBody));
}
