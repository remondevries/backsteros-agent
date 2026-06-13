import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, RunViewModel } from "../chat/types";
import {
  createSession,
  getSessionState,
  saveSessionState,
  type SessionRecordResponse,
} from "../lib/api";

const SESSION_STORAGE_KEY = "backsteros.rightPanel.sessionId";

type RightPanelSession = {
  sessionId: string;
  initialMessages: ChatMessage[];
  initialRuns: Record<string, RunViewModel>;
  stateLoaded: boolean;
};

function readStoredSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredSessionId(sessionId: string) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  } catch {
    // Ignore quota / private mode errors.
  }
}

function toSession(
  sessionId: string,
  state?: SessionRecordResponse | null,
): RightPanelSession {
  return {
    sessionId,
    initialMessages: state?.messages ?? [],
    initialRuns: state?.runs ?? {},
    stateLoaded: Boolean(state),
  };
}

export function useRightPanelSession(enabled: boolean) {
  const [session, setSession] = useState<RightPanelSession | null>(null);
  const [loading, setLoading] = useState(true);
  const saveTimersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!enabled) {
      setSession(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        const storedSessionId = readStoredSessionId();
        if (storedSessionId) {
          const state = await getSessionState(storedSessionId).catch(() => null);
          if (!cancelled && state) {
            setSession(toSession(storedSessionId, state));
            return;
          }
        }

        const created = await createSession();
        writeStoredSessionId(created.sessionId);
        if (!cancelled) {
          setSession(toSession(created.sessionId, created));
        }
      } catch {
        if (!cancelled) {
          setSession(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const saveSessionStateDebounced = useCallback(
    (sessionId: string, messages: ChatMessage[], runs: Record<string, RunViewModel>) => {
      const existing = saveTimersRef.current.get(sessionId);
      if (existing) {
        window.clearTimeout(existing);
      }

      const timer = window.setTimeout(() => {
        saveTimersRef.current.delete(sessionId);
        void saveSessionState(sessionId, { messages, runs }).catch(() => undefined);
      }, 500);

      saveTimersRef.current.set(sessionId, timer);
    },
    [],
  );

  useEffect(() => {
    const timers = saveTimersRef.current;
    return () => {
      for (const timer of timers.values()) {
        window.clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  return {
    session,
    loading,
    saveSessionState: saveSessionStateDebounced,
  };
}
