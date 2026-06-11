import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, RunViewModel } from "../chat/types";
import {
  createLookupSession,
  deleteLookupSession,
  getLookupSessionState,
  listLookupSessions,
  saveLookupSessionState,
  setActiveLookupSession,
  updateLookupSessionTitle,
  type LookupSessionRecordResponse,
  type LookupSessionSummaryResponse,
} from "../lib/lookupApi";

export type LookupSessionTab = {
  sessionId: string;
  title: string;
  initialMessages: ChatMessage[];
  initialRuns: Record<string, RunViewModel>;
  stateLoaded: boolean;
};

const DEFAULT_TITLE = "New Lookup";

function toLookupSessionTab(
  summary: LookupSessionSummaryResponse,
  state?: LookupSessionRecordResponse | null,
): LookupSessionTab {
  return {
    sessionId: summary.sessionId,
    title: summary.title || DEFAULT_TITLE,
    initialMessages: state?.messages ?? [],
    initialRuns: state?.runs ?? {},
    stateLoaded: Boolean(state),
  };
}

function deriveTitle(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return DEFAULT_TITLE;
  return trimmed.length > 24 ? `${trimmed.slice(0, 24)}…` : trimmed;
}

function normalizeManualTitle(title: string): string {
  const trimmed = title.trim().replace(/\s+/g, " ");
  return trimmed || DEFAULT_TITLE;
}

export function useLookupSessionTabs(enabled: boolean) {
  const [tabs, setTabs] = useState<LookupSessionTab[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [mountedSessionIds, setMountedSessionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const saveTimersRef = useRef<Map<string, number>>(new Map());
  const tabsRef = useRef(tabs);
  const activeSessionIdRef = useRef(activeSessionId);

  useEffect(() => {
    tabsRef.current = tabs;
    activeSessionIdRef.current = activeSessionId;
  }, [tabs, activeSessionId]);

  const markSessionMounted = useCallback((sessionId: string) => {
    setMountedSessionIds((current) =>
      current.includes(sessionId) ? current : [...current, sessionId],
    );
  }, []);

  const hydrateTabState = useCallback(async (sessionId: string) => {
    const tab = tabsRef.current.find((entry) => entry.sessionId === sessionId);
    if (!tab || tab.stateLoaded) {
      return;
    }

    try {
      const state = await getLookupSessionState(sessionId);
      setTabs((current) =>
        current.map((entry) =>
          entry.sessionId === sessionId
            ? {
                ...entry,
                initialMessages: state.messages ?? [],
                initialRuns: state.runs ?? {},
                stateLoaded: true,
              }
            : entry,
        ),
      );
    } catch {
      // Ignore transient load errors; the tab stays empty until retry.
    }
  }, []);

  const loadTabs = useCallback(async () => {
    const result = await listLookupSessions();
    let summaries = result.sessions;

    if (summaries.length === 0) {
      const created = await createLookupSession();
      const tab = toLookupSessionTab(created, created);
      setTabs([tab]);
      setActiveSessionId(tab.sessionId);
      setMountedSessionIds([tab.sessionId]);
      return { tabs: [tab], activeSessionId: tab.sessionId };
    }

    const activeId =
      result.activeSessionId && summaries.some((tab) => tab.sessionId === result.activeSessionId)
        ? result.activeSessionId
        : summaries[0]?.sessionId ?? null;

    const activeState = activeId ? await getLookupSessionState(activeId) : null;
    const nextTabs = summaries.map((summary) =>
      toLookupSessionTab(summary, summary.sessionId === activeId ? activeState : null),
    );

    setTabs(nextTabs);
    setActiveSessionId(activeId);
    if (activeId) {
      setMountedSessionIds([activeId]);
    }
    return { tabs: nextTabs, activeSessionId: activeId };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        await loadTabs();
      } finally {
        setLoading(false);
      }
    })();
  }, [enabled, loadTabs]);

  const selectTab = useCallback(
    (sessionId: string) => {
      setActiveSessionId(sessionId);
      markSessionMounted(sessionId);
      void setActiveLookupSession(sessionId).catch(() => {
        // Ignore transient persistence errors.
      });
      void hydrateTabState(sessionId);
    },
    [hydrateTabState, markSessionMounted],
  );

  const newTab = useCallback(async () => {
    const created = await createLookupSession();
    const tab = toLookupSessionTab(created, created);
    setTabs((current) => [...current, tab]);
    setActiveSessionId(tab.sessionId);
    markSessionMounted(tab.sessionId);
    return tab;
  }, [markSessionMounted]);

  const closeTab = useCallback(async (sessionId: string) => {
    const currentTabs = tabsRef.current;
    if (currentTabs.length <= 1) {
      return { nextActiveId: activeSessionIdRef.current };
    }

    const index = currentTabs.findIndex((tab) => tab.sessionId === sessionId);
    if (index < 0) return { nextActiveId: activeSessionIdRef.current };

    const timer = saveTimersRef.current.get(sessionId);
    if (timer) {
      window.clearTimeout(timer);
      saveTimersRef.current.delete(sessionId);
    }

    const result = await deleteLookupSession(sessionId);
    let nextTabs = currentTabs.filter((tab) => tab.sessionId !== sessionId);

    if (result.createdSession) {
      nextTabs = [toLookupSessionTab(result.createdSession, result.createdSession)];
    }

    const nextActiveId =
      result.activeSessionId ??
      nextTabs[Math.min(index, nextTabs.length - 1)]?.sessionId ??
      nextTabs[0]?.sessionId ??
      null;

    setTabs(nextTabs);
    setActiveSessionId(nextActiveId);
    setMountedSessionIds((current) => {
      const remaining = new Set(nextTabs.map((tab) => tab.sessionId));
      return current.filter((id) => remaining.has(id));
    });
    if (nextActiveId) {
      markSessionMounted(nextActiveId);
      void hydrateTabState(nextActiveId);
    }

    return { nextActiveId };
  }, [hydrateTabState, markSessionMounted]);

  const selectRelativeTab = useCallback(
    (direction: -1 | 1) => {
      const currentTabs = tabsRef.current;
      if (currentTabs.length === 0) return;

      const currentIndex = currentTabs.findIndex(
        (tab) => tab.sessionId === activeSessionIdRef.current,
      );
      const startIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex = (startIndex + direction + currentTabs.length) % currentTabs.length;
      selectTab(currentTabs[nextIndex]!.sessionId);
    },
    [selectTab],
  );

  const updateTabTitle = useCallback((sessionId: string, title: string) => {
    const nextTitle = deriveTitle(title);
    setTabs((current) =>
      current.map((tab) =>
        tab.sessionId === sessionId && tab.title === DEFAULT_TITLE
          ? { ...tab, title: nextTitle }
          : tab,
      ),
    );
    void updateLookupSessionTitle(sessionId, nextTitle).catch(() => {
      // Ignore transient persistence errors.
    });
  }, []);

  const renameTab = useCallback((sessionId: string, title: string) => {
    const nextTitle = normalizeManualTitle(title);
    setTabs((current) =>
      current.map((tab) =>
        tab.sessionId === sessionId ? { ...tab, title: nextTitle } : tab,
      ),
    );
    void updateLookupSessionTitle(sessionId, nextTitle).catch(() => {
      // Ignore transient persistence errors.
    });
  }, []);

  const cancelPendingTabStateSave = useCallback((sessionId: string) => {
    const timer = saveTimersRef.current.get(sessionId);
    if (timer) {
      window.clearTimeout(timer);
      saveTimersRef.current.delete(sessionId);
    }
  }, []);

  const saveTabState = useCallback(
    (sessionId: string, messages: ChatMessage[], runs: Record<string, RunViewModel>) => {
      const existing = saveTimersRef.current.get(sessionId);
      if (existing) {
        window.clearTimeout(existing);
      }

      const timer = window.setTimeout(() => {
        saveTimersRef.current.delete(sessionId);
        void saveLookupSessionState(sessionId, { messages, runs }).catch(() => {
          // Ignore transient persistence errors.
        });
      }, 500);

      saveTimersRef.current.set(sessionId, timer);
    },
    [],
  );

  useEffect(() => {
    return () => {
      for (const timer of saveTimersRef.current.values()) {
        window.clearTimeout(timer);
      }
      saveTimersRef.current.clear();
    };
  }, []);

  return {
    tabs,
    activeSessionId,
    mountedSessionIds,
    loading,
    selectTab,
    newTab,
    closeTab,
    selectRelativeTab,
    updateTabTitle,
    renameTab,
    cancelPendingTabStateSave,
    saveTabState,
  };
}
