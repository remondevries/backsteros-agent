import { useCallback, useState } from "react";

/** Manages collapsed/expanded state for status-grouped lists. */
export function useCollapsibleGroups() {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((previous) => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const expandGroup = useCallback((key: string) => {
    setCollapsedGroups((previous) => {
      if (!previous.has(key)) return previous;
      const next = new Set(previous);
      next.delete(key);
      return next;
    });
  }, []);

  return { collapsedGroups, toggleGroup, expandGroup };
}
