import { useCallback, useEffect, useRef, useState } from "react";
import {
  createLinearIssueComment,
  fetchLinearIssueCommentThread,
  type LinearComment,
} from "../lib/api";

const POLL_INTERVAL_MS = 3000;
const POLL_DURATION_MS = 45000;

export function useLinearIssueCommentThread(
  issueId: string,
  threadId: string | null,
  enabled = true,
) {
  const [comments, setComments] = useState<LinearComment[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollUntilRef = useRef(0);

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
      } else {
        setComments(result.comments);
        setViewerId(result.viewerId);
        setError(null);
      }
    } catch {
      setComments([]);
      setViewerId(null);
      setError("Failed to load thread.");
    } finally {
      setLoading(false);
    }
  }, [enabled, issueId, threadId]);

  useEffect(() => {
    if (!enabled || !issueId || !threadId) {
      setComments([]);
      setViewerId(null);
      setLoading(false);
      setError(null);
      pollUntilRef.current = 0;
      return;
    }

    setLoading(true);
    void refresh();
  }, [enabled, issueId, refresh, threadId]);

  useEffect(() => {
    if (!enabled || !issueId || !threadId) return;

    const interval = window.setInterval(() => {
      if (Date.now() > pollUntilRef.current) return;
      void refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [enabled, issueId, refresh, threadId]);

  const sendReply = useCallback(
    async (body: string) => {
      if (!issueId || !threadId) return false;
      const trimmed = body.trim();
      if (!trimmed) return false;

      setSending(true);
      setError(null);
      try {
        const result = await createLinearIssueComment(issueId, {
          body: trimmed,
          parentId: threadId,
        });
        if (result.error || !result.comment) {
          setError(result.error ?? "Failed to send comment.");
          return false;
        }

        pollUntilRef.current = Date.now() + POLL_DURATION_MS;
        await refresh();
        return true;
      } catch {
        setError("Failed to send comment.");
        return false;
      } finally {
        setSending(false);
      }
    },
    [issueId, refresh, threadId],
  );

  return {
    comments,
    viewerId,
    loading,
    sending,
    error,
    refresh,
    sendReply,
  };
}
