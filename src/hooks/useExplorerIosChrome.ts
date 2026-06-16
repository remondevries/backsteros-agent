import type { IosMobileQuickAction } from "../app/contentPanelChromeContext";
import { useContentPanelNavigation } from "../app/contentPanelNavigation";
import { isContentDetailViewOpen } from "../lib/iosQuickActionVisibility";
import { useIosMobileQuickActions } from "./useIosMobileQuickActions";

/** Register iOS bottom-nav quick actions for a list explorer. */
export function useExplorerIosChrome(
  quickActions: IosMobileQuickAction[] | null,
  options?: { hideWhenDetailOpen?: boolean },
) {
  const navigation = useContentPanelNavigation();
  const hideWhenDetailOpen = options?.hideWhenDetailOpen ?? true;
  const detailOpen = hideWhenDetailOpen && isContentDetailViewOpen(navigation);

  useIosMobileQuickActions(quickActions !== null && !detailOpen ? quickActions : null);
}

export { useAutoOpenFirstListItem } from "./useAutoOpenFirstListItem";
