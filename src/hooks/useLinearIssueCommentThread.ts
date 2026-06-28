import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createLinearComment,
  fetchLinearAgentSession,
  fetchLinearCommentThread,
  type LinearComment,
} from "../lib/api";
import type { LinearCommentTarget } from "../lib/linearCommentTarget";
import type { LinearAgentSessionSnapshot } from "../lib/linearAgentSessionTypes";
import {
  buildOptimisticLinearUserComment,
  findNewSubstantiveLinearAgentCommentIds,
  isPendingLinearComment,
  mergeLinearThreadComments,
  reconcileLinearThreadComments,
  snapshotSubstantiveLinearAgentCommentIds,
} from "../app/linear-threads/linearThreadFormat";
import { resolveLinearAgentSessionId } from "../app/linear-threads/linearAgentSessionFormat";

const POLL_INTERVAL_MS = 2000;
const POLL_FOR_REPLY_MS = 10 * 60_000;
const THREAD_UNAVAILABLE_MESSAGE = "This thread is no longer available.";

export type LinearCommentThreadSeed = {
  threadId: string;
  comments: LinearComment[];
  viewerId: string | null;
};

export function useLinearCommentThread(
  target: LinearCommentTarget | null,
  threadId: string | null,
  enabled = true,
  options?: {
    onAgentPollSettled?: () => void;
    onSubstantiveAgentReply?: () => void;
    onThreadUnavailable?: () => void;
    seedThread?: LinearCommentThreadSeed | null;
  },
) {
  const [comments, setComments] = useState<LinearComment[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [awaitingAgentReply, setAwaitingAgentReply] = useState(false);
  const [pollingForAgentReply, setPollingForAgentReply] = useState(false);
  const [agentSessionSnapshot, setAgentSessionSnapshot] =
    useState<LinearAgentSessionSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollForReplyUntilRef = useRef(0);
  const pollSettledRef = useRef(false);
  const baselineSubstantiveAgentCommentIdsRef = useRef<Set<string>>(new Set());
  const onAgentPollSettledRef = useRef(options?.onAgentPollSettled);
  onAgentPollSettledRef.current = options?.onAgentPollSettled;
  const onSubstantiveAgentReplyRef = useRef(options?.onSubstantiveAgentReply);
  onSubstantiveAgentReplyRef.current = options?.onSubstantiveAgentReply;
  const onThreadUnavailableRef = useRef(options?.onThreadUnavailable);
  onThreadUnavailableRef.current = options?.onThreadUnavailable;
  const refreshRef = useRef<() => Promise<void>>(async () => undefined);
  const appliedSeedThreadIdRef = useRef<string | null>(null);
  const seedThreadRef = useRef(options?.seedThread);
  seedThreadRef.current = options?.seedThread;
  const targetKey = target ? `${target.kind}:${target.id}` : null;

  const mergeServerComments = useCallback(
    (localComments: LinearComment[], serverComments: LinearComment[]): LinearComment[] => {
      const pending = localComments.filter((comment) => isPendingLinearComment(comment.id));
      let merged = serverComments;
      for (const comment of pending) {
        merged = mergeLinearThreadComments(merged, comment);
      }
      return merged;
    },
    [],
  );

  const agentSessionId = useMemo(
    () => (threadId ? resolveLinearAgentSessionId(comments, threadId) : null),
    [comments, threadId],
  );

  const settleAgentPoll = useCallback((_reason: "reply" | "timeout" | "thread-change") => {
    pollForReplyUntilRef.current = 0;
    setPollingForAgentReply(false);
    setAwaitingAgentReply(false);
    setAgentSessionSnapshot(null);
    if (!pollSettledRef.current) {
      pollSettledRef.current = true;
      onAgentPollSettledRef.current?.();
    }
  }, []);

  const cancelAwaitingAgentReply = useCallback(() => {
    pollForReplyUntilRef.current = 0;
    setPollingForAgentReply(false);
    setAwaitingAgentReply(false);
    setAgentSessionSnapshot(null);
    pollSettledRef.current = true;
  }, []);

  const beginAwaitingAgentReply = useCallback(
    (commentsSnapshot?: LinearComment[]) => {
      const source = commentsSnapshot ?? comments;
      const now = Date.now();
      baselineSubstantiveAgentCommentIdsRef.current = snapshotSubstantiveLinearAgentCommentIds(
        source,
        viewerId,
      );
      pollForReplyUntilRef.current = now + POLL_FOR_REPLY_MS;
      pollSettledRef.current = false;
      setPollingForAgentReply(true);
      setAwaitingAgentReply(true);
    },
    [comments, viewerId],
  );
  const beginAwaitingAgentReplyRef = useRef(beginAwaitingAgentReply);
  beginAwaitingAgentReplyRef.current = beginAwaitingAgentReply;

  const refreshAgentSession = useCallback(async (sessionId: string) => {
    try {
      const result = await fetchLinearAgentSession(sessionId);
      if (result.session) {
        setAgentSessionSnapshot(result.session);
      }
    } catch {
      // Keep the last known snapshot when polling fails transiently.
    }
  }, []);

  const applyThreadResult = useCallback(
    (nextComments: LinearComment[], nextViewerId: string | null) => {
      setComments((current) => {
        const merged = mergeServerComments(current, nextComments);
        if (pollForReplyUntilRef.current > 0) {
          const newReplyIds = findNewSubstantiveLinearAgentCommentIds(
            merged,
            nextViewerId,
            baselineSubstantiveAgentCommentIdsRef.current,
          );
          if (newReplyIds.length > 0) {
            queueMicrotask(() => {
              onSubstantiveAgentReplyRef.current?.();
              settleAgentPoll("reply");
            });
          }
        }
        return merged;
      });
      setViewerId(nextViewerId);
    },
    [mergeServerComments, settleAgentPoll],
  );

  const refresh = useCallback(async () => {
    if (!enabled || !target || !threadId) {
      setComments([]);
      setViewerId(null);
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const result = await fetchLinearCommentThread(target, threadId);
      if (result.error) {
        setComments([]);
        setViewerId(null);
        setError(result.error);
      } else if (result.comments.length === 0) {
        setComments([]);
        setViewerId(result.viewerId);
        setError(THREAD_UNAVAILABLE_MESSAGE);
        onThreadUnavailableRef.current?.();
      } else {
        applyThreadResult(result.comments, result.viewerId);
        setError(null);
      }
    } catch {
      setComments([]);
      setViewerId(null);
      setError("Failed to load thread.");
    } finally {
      setLoading(false);
    }
  }, [applyThreadResult, enabled, target, threadId]);

  refreshRef.current = refresh;

  useEffect(() => {
    if (!enabled || !target || !threadId) {
      setComments([]);
      setViewerId(null);
      setLoading(false);
      setError(null);
      pollForReplyUntilRef.current = 0;
      setPollingForAgentReply(false);
      setAwaitingAgentReply(false);
      setAgentSessionSnapshot(null);
      appliedSeedThreadIdRef.current = null;
      return;
    }

    pollForReplyUntilRef.current = 0;
    setPollingForAgentReply(false);
    setAwaitingAgentReply(false);
    setAgentSessionSnapshot(null);

    const seed =
      seedThreadRef.current?.threadId === threadId ? seedThreadRef.current : null;
    if (seed && appliedSeedThreadIdRef.current !== threadId) {
      appliedSeedThreadIdRef.current = threadId;
      setComments(seed.comments);
      setViewerId(seed.viewerId);
      setLoading(false);
      setError(null);
      beginAwaitingAgentReplyRef.current(seed.comments);
      void refreshRef.current();
      return;
    }

    setLoading(true);
    void refreshRef.current();
    // Only re-run when the target thread changes — not when comments/poll state updates.
  }, [enabled, targetKey, threadId]);

  useEffect(() => {
    if (!enabled || !target || !threadId || !pollingForAgentReply) return;

    void refreshRef.current();

    const interval = window.setInterval(() => {
      if (Date.now() > pollForReplyUntilRef.current) {
        settleAgentPoll("timeout");
        return;
      }
      void refreshRef.current();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [enabled, pollingForAgentReply, settleAgentPoll, target, threadId]);

  useEffect(() => {
    const shouldPollSession = Boolean(
      enabled &&
        threadId &&
        agentSessionId &&
        (awaitingAgentReply || pollingForAgentReply || sending),
    );
    if (!shouldPollSession || !agentSessionId) {
      if (!awaitingAgentReply && !pollingForAgentReply && !sending) {
        setAgentSessionSnapshot(null);
      }
      return;
    }

    void refreshAgentSession(agentSessionId);
    const interval = window.setInterval(() => {
      void refreshAgentSession(agentSessionId);
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    agentSessionId,
    awaitingAgentReply,
    enabled,
    pollingForAgentReply,
    refreshAgentSession,
    sending,
    threadId,
  ]);

  const sendReply = useCallback(
    async (body: string) => {
      if (!target || !threadId) return false;
      const trimmed = body.trim();
      if (!trimmed) return false;

      const startedAt = Date.now();
      // #region agent log
      fetch("http://127.0.0.1:7933/ingest/280fb855-6de7-45c0-90bf-5ee8faee78a1", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "180d80" },
        body: JSON.stringify({
          sessionId: "180d80",
          hypothesisId: "PERF1",
          location: "useLinearIssueCommentThread.ts:sendReply:start",
          message: "Linear thread send started",
          data: { threadId, bodyLength: trimmed.length, hasViewerId: Boolean(viewerId) },
          timestamp: startedAt,
        }),
      }).catch(() => {});
      // #endregion

      if (!viewerId) {
        setError("Still loading your Linear identity. Try again in a moment.");
        return false;
      }

      const pendingComment = buildOptimisticLinearUserComment(trimmed, threadId, viewerId);
      const pendingId = pendingComment.id;
      const optimisticComments = mergeLinearThreadComments(comments, pendingComment);

      setSending(true);
      setError(null);
      setComments(optimisticComments);
      beginAwaitingAgentReply(optimisticComments);

      // #region agent log
      fetch("http://127.0.0.1:7933/ingest/280fb855-6de7-45c0-90bf-5ee8faee78a1", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "180d80" },
        body: JSON.stringify({
          sessionId: "180d80",
          hypothesisId: "PERF1",
          location: "useLinearIssueCommentThread.ts:sendReply:optimistic",
          message: "Optimistic comment applied",
          data: { elapsedMs: Date.now() - startedAt },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      try {
        const result = await createLinearComment(target, {
          body: trimmed,
          parentId: threadId,
        });
        if (result.error || !result.comment) {
          setComments((current) => reconcileLinearThreadComments(current, pendingId, null));
          setError(result.error ?? "Failed to send comment.");
          cancelAwaitingAgentReply();
          return false;
        }

        setComments((current) =>
          reconcileLinearThreadComments(current, pendingId, result.comment!),
        );

        // #region agent log
        fetch("http://127.0.0.1:7933/ingest/280fb855-6de7-45c0-90bf-5ee8faee78a1", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "180d80" },
          body: JSON.stringify({
            sessionId: "180d80",
            hypothesisId: "PERF2",
            location: "useLinearIssueCommentThread.ts:sendReply:confirmed",
            message: "Linear comment confirmed",
            data: {
              elapsedMs: Date.now() - startedAt,
              awaitingAgentReply: pollForReplyUntilRef.current > Date.now(),
              pollingForAgentReply: true,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion

        return true;
      } catch (error) {
        setComments((current) => reconcileLinearThreadComments(current, pendingId, null));
        const message = error instanceof Error ? error.message : "Failed to send comment.";
        if (message.includes("Entity not found: Comment")) {
          setError(THREAD_UNAVAILABLE_MESSAGE);
          onThreadUnavailableRef.current?.();
        } else {
          setError(message);
        }
        cancelAwaitingAgentReply();
        return false;
      } finally {
        setSending(false);
      }
    },
    [beginAwaitingAgentReply, cancelAwaitingAgentReply, comments, settleAgentPoll, target, threadId, viewerId],
  );

  return {
    comments,
    viewerId,
    loading,
    sending,
    awaitingAgentReply,
    agentSessionSnapshot,
    error,
    refresh,
    sendReply,
    beginAwaitingAgentReply,
  };
}

/** @deprecated Use useLinearCommentThread with `{ kind: "issue", id }` */
export function useLinearIssueCommentThread(
  issueId: string,
  threadId: string | null,
  enabled = true,
  options?: {
    onAgentPollSettled?: () => void;
    onSubstantiveAgentReply?: () => void;
    onThreadUnavailable?: () => void;
    seedThread?: LinearCommentThreadSeed | null;
  },
) {
  return useLinearCommentThread(
    issueId ? { kind: "issue", id: issueId } : null,
    threadId,
    enabled,
    options,
  );
}
