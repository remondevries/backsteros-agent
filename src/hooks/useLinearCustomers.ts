import { useCallback, useEffect, useState } from "react";
import { fetchAllLinearCustomers, type LinearCustomerSummary } from "../lib/api";

export function useLinearCustomers(enabled: boolean) {
  const [customers, setCustomers] = useState<LinearCustomerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (options?: { background?: boolean }) => {
      if (!enabled) {
        setCustomers([]);
        setError(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const isBackgroundRefresh = options?.background ?? false;
      if (isBackgroundRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const result = await fetchAllLinearCustomers();
        if (result.error) {
          setError(result.error);
          setCustomers([]);
        } else {
          setCustomers(result.customers);
        }
      } catch (err) {
        setCustomers([]);
        setError(err instanceof Error ? err.message : "Failed to load organizations");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [enabled],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { customers, loading, refreshing, error, refresh };
}
