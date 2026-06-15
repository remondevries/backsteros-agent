import { useCallback, useEffect, useState } from "react";
import {
  fetchLinearIssueDetail,
  updateLinearIssueDetail as patchLinearIssueDetail,
  type LinearIssueDetail,
  type LinearIssueDetailUpdates,
} from "../lib/api";
import { notifyLinearIssueListUpdateFromDetail, linearIssueDetailToListPatch } from "../lib/linearIssueListPatch";
import { notifyLinearIssueListChange } from "../lib/linearIssueListEvents";
import {
  clearLinearIssueDetailSeed,
  peekLinearIssueDetailSeedMeta,
} from "../lib/linearIssueDetailSeed";
import {
  applyPendingDraftUpdatesToDetailLocal,
  isDraftIssueId,
  queueInboxDraftIssueUpdates,
} from "../lib/inboxDraftIssue";

export function useLinearIssueDetail(
  issueId: string,
  enabled = true,
  options?: { inboxMode?: boolean },
) {
  const [issue, setIssue] = useState<LinearIssueDetail | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !issueId) {
      setIssue(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const inboxMode = options?.inboxMode ?? false;
    const seedMeta = peekLinearIssueDetailSeedMeta(issueId);
    const seed = seedMeta?.detail ?? null;
    if (seed) {
      setIssue(seed);
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
      setError(null);
    }

    if ((inboxMode || isDraftIssueId(issueId)) && seedMeta?.freshCreate) {
      return () => {
        cancelled = true;
      };
    }

    void fetchLinearIssueDetail(issueId).then((result) => {
      if (cancelled) return;
      if (result.error || !result.issue) {
        setIssue(null);
        setError(result.error ?? "Failed to load issue.");
      } else {
        setIssue(result.issue);
        setError(null);
        clearLinearIssueDetailSeed(issueId);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, issueId, options?.inboxMode]);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!enabled || !issueId) return;
    const silent = options?.silent ?? false;
    if (!silent) {
      setRefreshing(true);
    }
    setError(null);
    try {
      const result = await fetchLinearIssueDetail(issueId);
      if (result.error || !result.issue) {
        setIssue(null);
        setError(result.error ?? "Failed to load issue.");
      } else {
        setIssue(result.issue);
        setError(null);
        notifyLinearIssueListUpdateFromDetail(result.issue);
      }
    } finally {
      if (!silent) {
        setRefreshing(false);
      }
    }
  }, [enabled, issueId]);

  const updateIssue = useCallback(
    async (updates: LinearIssueDetailUpdates): Promise<string | null> => {
      if (!enabled || !issueId) return "Issue updates are disabled.";
      if (isDraftIssueId(issueId)) {
        queueInboxDraftIssueUpdates(issueId, updates);
        let nextIssue: LinearIssueDetail | null = null;
        setIssue((current) => {
          if (!current) return current;
          nextIssue = applyPendingDraftUpdatesToDetailLocal(current, updates);
          return nextIssue;
        });
        if (nextIssue) {
          notifyLinearIssueListChange({
            type: "update",
            issueId,
            patch: linearIssueDetailToListPatch(nextIssue),
          });
        }
        return null;
      }
      setUpdating(true);
      setError(null);
      try {
        const result = await patchLinearIssueDetail(issueId, updates);
        if (result.error || !result.issue) {
          const message = result.error ?? "Failed to update issue.";
          setError(message);
          return message;
        }
        setIssue(result.issue);
        notifyLinearIssueListUpdateFromDetail(result.issue);
        return null;
      } finally {
        setUpdating(false);
      }
    },
    [enabled, issueId],
  );

  return { issue, loading, refreshing, updating, error, refresh, updateIssue };
}
