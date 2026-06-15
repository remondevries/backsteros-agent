import { useEffect, useRef, useState } from "react";
import { nextWorkoutDashboardGraphCollapsed } from "../lib/workouts/workoutDashboardGraph";

export function useWorkoutDashboardGraphScroll(enabled = true) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [graphCollapsed, setGraphCollapsed] = useState(false);
  const collapsedRef = useRef(false);
  const ignoreExpandOnceRef = useRef(false);

  useEffect(() => {
    collapsedRef.current = graphCollapsed;
  }, [graphCollapsed]);

  useEffect(() => {
    if (!enabled) {
      collapsedRef.current = false;
      ignoreExpandOnceRef.current = false;
      setGraphCollapsed(false);
      return;
    }

    const element = scrollRef.current;
    if (!element) {
      return;
    }

    const syncFromScroll = () => {
      const scrollTop = element.scrollTop;
      const resolved = nextWorkoutDashboardGraphCollapsed(
        scrollTop,
        collapsedRef.current,
        ignoreExpandOnceRef.current,
      );
      ignoreExpandOnceRef.current = resolved.ignoreExpandOnce;

      if (resolved.collapsed === collapsedRef.current) {
        return;
      }

      collapsedRef.current = resolved.collapsed;
      setGraphCollapsed(resolved.collapsed);
    };

    syncFromScroll();
    element.addEventListener("scroll", syncFromScroll, { passive: true });
    return () => element.removeEventListener("scroll", syncFromScroll);
  }, [enabled]);

  return {
    scrollRef,
    graphCollapsed,
  };
}
