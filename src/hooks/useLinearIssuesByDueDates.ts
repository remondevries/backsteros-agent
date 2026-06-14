import { useCallback, useEffect, useMemo, useState } from "react";
import type { LinearIssueEntity } from "../chat/types";
import { fetchLinearIssuesByDueDates } from "../lib/api";
import { onLinearIssueListChange } from "../lib/linearIssueListEvents";

function patchIssuesByDueDateMap(
  current: Record<string, LinearIssueEntity[]>,
  dueDates: string[],
  change: Parameters<Parameters<typeof onLinearIssueListChange>[0]>[0],
): Record<string, LinearIssueEntity[]> {
  if (change.type === "remove") {
    let changed = false;
    const next: Record<string, LinearIssueEntity[]> = {};
    for (const [date, issues] of Object.entries(current)) {
      const filtered = issues.filter((issue) => issue.id !== change.issueId);
      if (filtered.length !== issues.length) {
        changed = true;
      }
      if (filtered.length > 0) {
        next[date] = filtered;
      }
    }
    return changed ? next : current;
  }

  let existingDate: string | null = null;
  let existingIssue: LinearIssueEntity | null = null;
  for (const [date, issues] of Object.entries(current)) {
    const match = issues.find((issue) => issue.id === change.issueId);
    if (match) {
      existingDate = date;
      existingIssue = match;
      break;
    }
  }

  if (!existingIssue) {
    return current;
  }

  const patchedIssue = { ...existingIssue, ...change.patch };
  const nextDueDate = patchedIssue.dueDate?.trim().slice(0, 10) || null;
  const dueDateChanged = nextDueDate !== existingDate;

  if (!dueDateChanged) {
    return {
      ...current,
      [existingDate]: (current[existingDate] ?? []).map((issue) =>
        issue.id === change.issueId ? patchedIssue : issue,
      ),
    };
  }

  const next = { ...current };
  const remaining = (next[existingDate] ?? []).filter((issue) => issue.id !== change.issueId);
  if (remaining.length > 0) {
    next[existingDate] = remaining;
  } else {
    delete next[existingDate];
  }

  if (nextDueDate && dueDates.includes(nextDueDate)) {
    const bucket = next[nextDueDate] ?? [];
    next[nextDueDate] = [...bucket.filter((issue) => issue.id !== change.issueId), patchedIssue];
  }

  return next;
}

export function useLinearIssuesByDueDates(dueDates: string[], enabled: boolean) {
  const [issuesByDueDate, setIssuesByDueDate] = useState<Record<string, LinearIssueEntity[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dueDatesKey = useMemo(() => dueDates.join("\0"), [dueDates]);

  const refresh = useCallback(async () => {
    if (!enabled || dueDates.length === 0) {
      setIssuesByDueDate({});
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchLinearIssuesByDueDates(dueDates);
      setIssuesByDueDate(result.issuesByDueDate ?? {});
    } catch (fetchError) {
      setIssuesByDueDate({});
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load due-date issues");
    } finally {
      setLoading(false);
    }
  }, [dueDates, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled || dueDates.length === 0) return undefined;

    return onLinearIssueListChange((change) => {
      setIssuesByDueDate((current) => patchIssuesByDueDateMap(current, dueDates, change));
    });
  }, [dueDates, dueDatesKey, enabled]);

  return { issuesByDueDate, loading, error, refresh };
}
