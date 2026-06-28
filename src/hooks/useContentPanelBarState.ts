import { useEffect, useMemo, useRef } from "react";
import { useContentPanelChrome } from "../app/contentPanelChromeContext";
import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import { isIosDevice } from "../platform/iosStandalone";

export function useContentPanelBarState(options: {
  saving?: boolean;
  dirty?: boolean;
  error?: string | null;
  savedMessage?: string | null;
  loading?: boolean;
  loadingMessage?: string;
  refreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
  /** When set on iOS, initial list loading shows on the bottom-nav icon instead of the top status bar. */
  iosNavItemId?: SidebarNavItemId;
}) {
  const { setContentPanelBarState, setIosMobileNavLoadingItem } = useContentPanelChrome();
  const onRefreshRef = useRef(options.onRefresh);
  onRefreshRef.current = options.onRefresh;

  const showIosNavLoading =
    isIosDevice() && Boolean(options.iosNavItemId) && Boolean(options.loading);

  const message = useMemo(() => {
    if (options.error) return options.error;
    if (options.saving) return "Saving…";
    if (options.savedMessage) return options.savedMessage;
    if (options.dirty) return "Unsaved changes";
    if (options.loading) {
      if (showIosNavLoading) return null;
      return options.loadingMessage ?? "Loading…";
    }
    return null;
  }, [
    options.dirty,
    options.error,
    options.loading,
    options.loadingMessage,
    options.savedMessage,
    options.saving,
    showIosNavLoading,
  ]);

  const tone = options.error ? "error" : "default";
  const refreshing = Boolean(options.refreshing);
  const showRefresh = Boolean(options.onRefresh);

  useEffect(() => {
    const navItemId = options.iosNavItemId;
    if (!navItemId || !isIosDevice()) return;

    if (options.loading) {
      setIosMobileNavLoadingItem(navItemId);
      return () => setIosMobileNavLoadingItem(null);
    }

    setIosMobileNavLoadingItem(null);
  }, [options.loading, options.iosNavItemId, setIosMobileNavLoadingItem]);

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
