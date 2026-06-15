import { useEffect } from "react";
import { useListFirstNavigationLayout } from "./useNarrowContentLayout";

/** Desktop-only: auto-select the first list row when data loads (skipped on iOS / narrow list-first). */
export function useAutoOpenFirstListItem({
  enabled,
  loading,
  shouldOpen,
  onOpenFirst,
}: {
  enabled: boolean;
  loading: boolean;
  shouldOpen: boolean;
  onOpenFirst: () => void;
}) {
  const listFirstLayout = useListFirstNavigationLayout();

  useEffect(() => {
    if (listFirstLayout || !enabled || loading || !shouldOpen) {
      return;
    }
    onOpenFirst();
  }, [enabled, listFirstLayout, loading, onOpenFirst, shouldOpen]);
}
