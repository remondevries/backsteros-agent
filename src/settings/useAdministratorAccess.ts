import { useEffect, useState } from "react";
import { getAccountWorkspace } from "../lib/api";

export function useAdministratorAccess() {
  const [isAdministrator, setIsAdministrator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getAccountWorkspace()
      .then((account) => {
        if (!cancelled) {
          setIsAdministrator(account.isAdministrator);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsAdministrator(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { isAdministrator, loading };
}
