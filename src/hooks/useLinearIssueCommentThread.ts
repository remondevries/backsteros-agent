import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createLinearIssueComment,
  fetchLinearAgentSession,
  fetchLinearIssueCommentThread,
  type LinearComment,
} from "../lib/api";
import type { LinearAgentSessionSnapshot } from "../lib/linearAgentSessionTypes";
import {
  findNewSubstantiveLinearAgentCommentIds,
  mergeLinearThreadComments,
  resolveLinearThreadReplyParentId,
  snapshotSubstantiveLinearAgentCommentIds,
} from "../app/linear-threads/linearThreadFormat";
import { resolveLinearAgentSessionId } from "../app/linear-threads/linearAgentSessionFormat";

const POLL_INTERVAL_MS = 2000;
const POLL_FOR_REPLY_MS = 10 * 60_000;
const THREAD_UNAVAILABLE_MESSAGE = "This thread is no longer available.";

export function useLinearIssueCommentThread(
  issueId: string,
  threadId: string | null,
  enabled = true,
  options?: {
    onAgentPollSettled?: () => void;
    onSubstantiveAgentReply?: () => void;
    onThreadUnavailable?: () => void;
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

  const beginAwaitingAgentReply = useCallback(() => {
    const now = Date.now();
    baselineSubstantiveAgentCommentIdsRef.current = snapshotSubstantiveLinearAgentCommentIds(
      comments,
      viewerId,
    );
    pollForReplyUntilRef.current = now + POLL_FOR_REPLY_MS;
    pollSettledRef.current = false;
    setPollingForAgentReply(true);
    setAwaitingAgentReply(true);
  }, [comments, viewerId]);

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
      setComments(nextComments);
      setViewerId(nextViewerId);

      if (pollForReplyUntilRef.current > 0) {
        const newReplyIds = findNewSubstantiveLinearAgentCommentIds(
          nextComments,
          nextViewerId,
          baselineSubstantiveAgentCommentIdsRef.current,
        );
        if (newReplyIds.length > 0) {
          onSubstantiveAgentReplyRef.current?.();
          settleAgentPoll("reply");
        }
      }
    },
    [settleAgentPoll],
  );

  const refresh = useCallback(async () => {
    if (!enabled || !issueId || !threadId) {
      setComments([]);
      setViewerId(null);
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const result = await fetchLinearIssueCommentThread(issueId, threadId);
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
  }, [applyThreadResult, enabled, issueId, threadId]);

  refreshRef.current = refresh;

  useEffect(() => {
    if (!enabled || !issueId || !threadId) {
      setComments([]);
      setViewerId(null);
      setLoading(false);
      setError(null);
      pollForReplyUntilRef.current = 0;
      setPollingForAgentReply(false);
      setAwaitingAgentReply(false);
      setAgentSessionSnapshot(null);
      return;
    }

    pollForReplyUntilRef.current = 0;
    setPollingForAgentReply(false);
    setAwaitingAgentReply(false);
    setAgentSessionSnapshot(null);
    setLoading(true);
    void refreshRef.current();
  }, [enabled, issueId, threadId]);

  useEffect(() => {
    if (!enabled || !issueId || !threadId || !pollingForAgentReply) return;

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
  }, [enabled, issueId, pollingForAgentReply, settleAgentPoll, threadId]);

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
      if (!issueId || !threadId) return false;
      const trimmed = body.trim();
      if (!trimmed) return false;

      setSending(true);
      setError(null);
      try {
        const threadResult = await fetchLinearIssueCommentThread(issueId, threadId);
        if (threadResult.error || threadResult.comments.length === 0) {
          setComments([]);
          setViewerId(threadResult.viewerId);
          setError(threadResult.error ?? THREAD_UNAVAILABLE_MESSAGE);
          onThreadUnavailableRef.current?.();
          return false;
        }

        applyThreadResult(threadResult.comments, threadResult.viewerId);
        const parentId = resolveLinearThreadReplyParentId(threadResult.comments, threadId);

        const result = await createLinearIssueComment(issueId, {
          body: trimmed,
          parentId,
        });
        if (result.error || !result.comment) {
          setError(result.error ?? "Failed to send comment.");
          return false;
        }

        applyThreadResult(
          mergeLinearThreadComments(threadResult.comments, result.comment),
          threadResult.viewerId,
        );
        beginAwaitingAgentReply();
        await refresh();
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to send comment.";
        if (message.includes("Entity not found: Comment")) {
          setError(THREAD_UNAVAILABLE_MESSAGE);
          onThreadUnavailableRef.current?.();
        } else {
          setError(message);
        }
        return false;
      } finally {
        setSending(false);
      }
    },
    [applyThreadResult, beginAwaitingAgentReply, issueId, refresh, threadId],
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
};
