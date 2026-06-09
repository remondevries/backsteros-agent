import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, RunViewModel } from "../chat/types";
import {
  createSession,
  deleteSession,
  listSessions,
  saveSessionState,
  setActiveSession,
  updateSessionTitle,
  type SessionRecordResponse,
} from "../lib/api";

export type SessionTab = {
  sessionId: string;
  title: string;
  initialMessages: ChatMessage[];
  initialRuns: Record<string, RunViewModel>;
};

const DEFAULT_TITLE = "New Chat";

function toSessionTab(session: SessionRecordResponse): SessionTab {
  return {
    sessionId: session.sessionId,
    title: session.title || DEFAULT_TITLE,
    initialMessages: session.messages ?? [],
    initialRuns: session.runs ?? {},
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

export function useSessionTabs(enabled: boolean) {
  const [tabs, setTabs] = useState<SessionTab[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const saveTimersRef = useRef<Map<string, number>>(new Map());
  const tabsRef = useRef(tabs);
  const activeSessionIdRef = useRef(activeSessionId);
  useEffect(() => {
    tabsRef.current = tabs;
    activeSessionIdRef.current = activeSessionId;
  }, [tabs, activeSessionId]);

  const loadTabs = useCallback(async () => {
    const result = await listSessions();
    let nextTabs = result.sessions.map(toSessionTab);

    if (nextTabs.length === 0) {
      const created = await createSession();
      nextTabs = [toSessionTab(created)];
    }

    const activeId =
      result.activeSessionId && nextTabs.some((tab) => tab.sessionId === result.activeSessionId)
        ? result.activeSessionId
        : nextTabs[0]?.sessionId ?? null;

    setTabs(nextTabs);
    setActiveSessionId(activeId);
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

  const selectTab = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    void setActiveSession(sessionId).catch(() => {
      // Ignore transient persistence errors.
    });
  }, []);

  const newTab = useCallback(async () => {
    const created = await createSession();
    const tab = toSessionTab(created);
    setTabs((current) => [...current, tab]);
    setActiveSessionId(tab.sessionId);
    return tab;
  }, []);

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

    const result = await deleteSession(sessionId);
    let nextTabs = currentTabs.filter((tab) => tab.sessionId !== sessionId);

    if (result.createdSession) {
      nextTabs = [toSessionTab(result.createdSession)];
    }

    const nextActiveId =
      result.activeSessionId ??
      nextTabs[Math.min(index, nextTabs.length - 1)]?.sessionId ??
      nextTabs[0]?.sessionId ??
      null;

    setTabs(nextTabs);
    setActiveSessionId(nextActiveId);

    return { nextActiveId };
  }, []);

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
    void updateSessionTitle(sessionId, nextTitle).catch(() => {
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
    void updateSessionTitle(sessionId, nextTitle).catch(() => {
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

  const resetTabState = useCallback(
    async (sessionId: string) => {
      cancelPendingTabStateSave(sessionId);
      setTabs((current) =>
        current.map((tab) =>
          tab.sessionId === sessionId
            ? { ...tab, initialMessages: [], initialRuns: {} }
            : tab,
        ),
      );
      await saveSessionState(sessionId, { messages: [], runs: {} }).catch(() => {
        // Ignore transient persistence errors.
      });
    },
    [cancelPendingTabStateSave],
  );

  const saveTabState = useCallback(
    (sessionId: string, messages: ChatMessage[], runs: Record<string, RunViewModel>) => {
      const existing = saveTimersRef.current.get(sessionId);
      if (existing) {
        window.clearTimeout(existing);
      }

      const timer = window.setTimeout(() => {
        saveTimersRef.current.delete(sessionId);
        void saveSessionState(sessionId, { messages, runs }).catch(() => {
          // Ignore transient persistence errors.
        });
      }, 500);

      saveTimersRef.current.set(sessionId, timer);
    },
    [],
  );

  const reloadTabs = useCallback(async () => {
    setLoading(true);
    try {
      await loadTabs();
    } finally {
      setLoading(false);
    }
  }, [loadTabs]);

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
    loading,
    selectTab,
    newTab,
    closeTab,
    selectRelativeTab,
    updateTabTitle,
    renameTab,
    cancelPendingTabStateSave,
    resetTabState,
    saveTabState,
    reloadTabs,
  };
}
