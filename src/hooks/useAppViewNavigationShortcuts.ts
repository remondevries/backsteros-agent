import { useEffect } from "react";
import { getAdjacentAppView, type AppView } from "../app/appViews";

export function useAppViewNavigationShortcuts({
  enabled,
  activeView,
  onNavigate,
}: {
  enabled: boolean;
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}) {
  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || !event.altKey) return;
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;

      const nextView = getAdjacentAppView(
        activeView,
        event.key === "ArrowUp" ? "up" : "down",
      );
      if (nextView === activeView) return;

      event.preventDefault();
      event.stopPropagation();
      onNavigate(nextView);
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [activeView, enabled, onNavigate]);
}
