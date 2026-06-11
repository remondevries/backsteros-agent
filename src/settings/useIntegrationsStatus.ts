import { useCallback, useEffect, useState } from "react";
import { getIntegrationsStatus, type IntegrationsStatus } from "../lib/api";

export function useIntegrationsStatus(enabled: boolean) {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await getIntegrationsStatus();
      setStatus(next);
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [enabled, refresh]);

  return { status, refresh };
}
