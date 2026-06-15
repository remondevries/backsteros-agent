import type { IosMobileQuickAction } from "../app/contentPanelChromeContext";
import { useIosMobileQuickActions } from "./useIosMobileQuickActions";

/** Register iOS bottom-nav quick actions for a list explorer. */
export function useExplorerIosChrome(quickActions: IosMobileQuickAction[] | null) {
  useIosMobileQuickActions(quickActions);
}

export { useAutoOpenFirstListItem } from "./useAutoOpenFirstListItem";
