import { useCallback, useEffect, useState } from "react";
import {
  fetchLinearIssueDetail,
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
} from "../lib/inboxDraftIssue";
import { linearSync } from "../lib/linearSync";
import { applyOptimisticIssueDetailLocal } from "../lib/linearSync/optimistic";

export function useLinearIssueDetail(
  issueId: string,
  enabled = true,
  options?: { inboxMode?: boolean },
) {
  const [issue, setIssue] = useState<LinearIssueDetail | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const updating = false;
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
      const resolvedId = await linearSync.resolveId(issueId);
      const result = await fetchLinearIssueDetail(resolvedId);
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

      let nextIssue: LinearIssueDetail | null = null;
      setIssue((current) => {
        if (!current) return current;
        nextIssue = isDraftIssueId(issueId)
          ? applyPendingDraftUpdatesToDetailLocal(current, updates)
          : applyOptimisticIssueDetailLocal(current, updates);
        return nextIssue;
      });

      if (nextIssue) {
        notifyLinearIssueListChange({
          type: "update",
          issueId,
          patch: linearIssueDetailToListPatch(nextIssue),
        });
      }

      try {
        await linearSync.enqueueIssueUpdate(issueId, updates);
        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to queue issue update.";
        setError(message);
        return message;
      }
    },
    [enabled, issueId],
  );

  return { issue, loading, refreshing, updating, error, refresh, updateIssue };
}
