import { useCallback, useEffect, useState } from "react";
import {
  fetchLinearIssueSubIssues,
  type LinearIssueLinkedCustomer,
  type LinearIssueSubIssue,
} from "../lib/api";

export function useLinearIssueSubIssues(issueId: string, enabled = true) {
  const [subIssues, setSubIssues] = useState<LinearIssueSubIssue[]>([]);
  const [linkedCustomers, setLinkedCustomers] = useState<LinearIssueLinkedCustomer[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !issueId) return;
    setError(null);
    try {
      const result = await fetchLinearIssueSubIssues(issueId);
      if (result.error) {
        setSubIssues([]);
        setLinkedCustomers([]);
        setError(result.error);
      } else {
        setSubIssues(result.subIssues ?? []);
        setLinkedCustomers(result.linkedCustomers ?? []);
        setError(null);
      }
    } catch {
      setSubIssues([]);
      setLinkedCustomers([]);
      setError("Failed to load sub-issues.");
    } finally {
      setLoading(false);
    }
  }, [enabled, issueId]);

  useEffect(() => {
    if (!enabled || !issueId) {
      setSubIssues([]);
      setLinkedCustomers([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    void refresh();
  }, [enabled, issueId, refresh]);

  return { subIssues, linkedCustomers, loading, error, refresh };
}
