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
  user?: {
    id?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
  } | null;
};

const ISSUE_COMMENTS_QUERY = `
  query BacksterIssueComments($issueId: String!) {
    issue(id: $issueId) {
      comments {
        nodes {
          id
          body
          createdAt
          parent { id }
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

  const root = comments.find((comment) => comment.id === threadId && !comment.parentId);
  if (!root) {
    return { viewerId: viewerId ?? null, comments: [] };
  }

  const replies = comments.filter((comment) => comment.parentId === threadId);
  return {
    viewerId: viewerId ?? null,
    comments: sortByCreatedAtAsc([root, ...replies]),
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

export const LINEAR_AGENT_THREAD_PREFIX = "@linear";

export async function createLinearAgentThread(issueId: string): Promise<LinearComment> {
  return createLinearIssueComment(issueId, LINEAR_AGENT_THREAD_PREFIX);
}
