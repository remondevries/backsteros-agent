import { useEffect, useMemo, useRef } from "react";
import { useContentPanelNavigation } from "../app/contentPanelNavigation";

export function useContentPanelBarState(options: {
  saving?: boolean;
  dirty?: boolean;
  error?: string | null;
  loading?: boolean;
  loadingMessage?: string;
  refreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
}) {
  const { setContentPanelBarState } = useContentPanelNavigation();
  const onRefreshRef = useRef(options.onRefresh);
  onRefreshRef.current = options.onRefresh;

  const message = useMemo(() => {
    if (options.error) return options.error;
    if (options.saving) return "Saving…";
    if (options.dirty) return "Unsaved changes";
    if (options.loading) return options.loadingMessage ?? "Loading…";
    return null;
  }, [options.dirty, options.error, options.loading, options.loadingMessage, options.saving]);

  const tone = options.error ? "error" : "default";
  const refreshing = Boolean(options.refreshing || options.loading);
  const showRefresh = Boolean(options.onRefresh);

  useEffect(() => {
    if (!message && !showRefresh) {
      setContentPanelBarState(null);
      return;
    }

    setContentPanelBarState({
      message,
      tone,
      refreshing,
      onRefresh: showRefresh
        ? () => {
            void onRefreshRef.current?.();
          }
        : null,
    });

    return () => setContentPanelBarState(null);
  }, [message, refreshing, setContentPanelBarState, showRefresh, tone]);
}
