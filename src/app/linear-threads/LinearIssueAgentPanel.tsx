import { useCallback, useEffect, useMemo, useState } from "react";
import { createLinearIssueComment } from "../../lib/api";
import { useLinearIssueCommentThreads } from "../../hooks/useLinearIssueCommentThreads";
import { composerContextItems as buildComposerContextItems } from "../../lib/chatFocusContext";
import { useContentPanelNavigation, useFocusContent } from "../contentPanelNavigation";
import { LinearIssueThreadChat } from "./LinearIssueThreadChat";
import { LinearIssueThreadList } from "./LinearIssueThreadList";
import { RightPanelChatHeader } from "../RightPanelChatHeader";
import { getRightPanelAgentLabel } from "../rightPanelAgents";
import { ThreadHistoryIcon } from "./ThreadHistoryIcon";
import { ThreadPlusIcon } from "./ThreadPlusIcon";

type PanelMode = "chat" | "threads";

function readStoredThreadId(issueId: string): string | null {
  try {
    return localStorage.getItem(`backsteros.linearIssueThread.${issueId}`);
  } catch {
    return null;
  }
}

function writeStoredThreadId(issueId: string, threadId: string | null) {
  try {
    const key = `backsteros.linearIssueThread.${issueId}`;
    if (threadId) {
      localStorage.setItem(key, threadId);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function LinearIssueAgentPanel({
  issueId,
}: {
  issueId: string;
}) {
  const { threads, loading, error, refresh } = useLinearIssueCommentThreads(issueId);
  const { activeLinearIssue } = useContentPanelNavigation();
  const { focusContentSnapshot } = useFocusContent();
  const [panelMode, setPanelMode] = useState<PanelMode>("chat");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(() =>
    readStoredThreadId(issueId),
  );
  const [creatingThread, setCreatingThread] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setPanelMode("chat");
    setActiveThreadId(readStoredThreadId(issueId));
    setActionError(null);
  }, [issueId]);

  useEffect(() => {
    if (loading || threads.length === 0) return;

    const stored = readStoredThreadId(issueId);
    const storedExists = stored ? threads.some((thread) => thread.id === stored) : false;
    if (storedExists && stored) {
      setActiveThreadId(stored);
      return;
    }

    setActiveThreadId((current) => {
      if (current && threads.some((thread) => thread.id === current)) {
        return current;
      }
      return threads[0]?.id ?? null;
    });
  }, [issueId, loading, threads]);

  useEffect(() => {
    writeStoredThreadId(issueId, activeThreadId);
  }, [activeThreadId, issueId]);

  const handleSelectThread = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
    setPanelMode("chat");
    setActionError(null);
  }, []);

  const handleToggleHistory = useCallback(() => {
    setPanelMode((current) => (current === "threads" ? "chat" : "threads"));
    setActionError(null);
  }, []);

  const handleCreateThread = useCallback(async () => {
    if (creatingThread) return;
    setCreatingThread(true);
    setActionError(null);
    try {
      const result = await createLinearIssueComment(issueId, { newThread: true });
      if (result.error || !result.comment) {
        setActionError(result.error ?? "Failed to start a new thread.");
        return;
      }

      await refresh();
      setActiveThreadId(result.comment.id);
      setPanelMode("chat");
    } catch {
      setActionError("Failed to start a new thread.");
    } finally {
      setCreatingThread(false);
    }
  }, [creatingThread, issueId, refresh]);

  const handleStartThreadWithMessage = useCallback(
    async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed || creatingThread) return false;
      setCreatingThread(true);
      setActionError(null);
      try {
        const result = await createLinearIssueComment(issueId, { body: trimmed, newThread: true });
        if (result.error || !result.comment) {
          setActionError(result.error ?? "Failed to start a new thread.");
          return false;
        }

        await refresh();
        setActiveThreadId(result.comment.id);
        setPanelMode("chat");
        return true;
      } catch {
        setActionError("Failed to start a new thread.");
        return false;
      } finally {
        setCreatingThread(false);
      }
    },
    [creatingThread, issueId, refresh],
  );

  const composerContextItems = useMemo(() => {
    if (!activeLinearIssue || activeLinearIssue.id !== issueId) return [];
    return buildComposerContextItems({
      kind: "linear_issue",
      issueId: activeLinearIssue.id,
      identifier: activeLinearIssue.identifier,
      title: activeLinearIssue.title,
      description:
        focusContentSnapshot?.kind === "linear_issue"
          ? focusContentSnapshot.description
          : undefined,
      status: activeLinearIssue.status,
      stateType: activeLinearIssue.stateType,
    });
  }, [activeLinearIssue, focusContentSnapshot, issueId]);

  return (
    <div className="right-side-panel-chat">
      <RightPanelChatHeader
        title={getRightPanelAgentLabel("linear")}
        agentId="linear"
        actions={
          <>
            <button
              type="button"
              className={`linear-thread-header-button${panelMode === "threads" ? " linear-thread-header-button-active" : ""}`}
              onClick={handleToggleHistory}
              aria-label={panelMode === "threads" ? "Back to thread chat" : "Show thread history"}
              aria-pressed={panelMode === "threads"}
              title={panelMode === "threads" ? "Back to chat" : "Thread history"}
            >
              <ThreadHistoryIcon />
            </button>
            <button
              type="button"
              className="linear-thread-header-button"
              onClick={() => void handleCreateThread()}
              disabled={creatingThread}
              aria-label="Start new thread"
              title="New thread"
            >
              <ThreadPlusIcon />
            </button>
          </>
        }
      />
      <div className="right-side-panel-chat-body">
        {actionError ? <p className="linear-thread-list-status linear-thread-list-status-error">{actionError}</p> : null}
        {panelMode === "threads" ? (
          <LinearIssueThreadList
            threads={threads}
            activeThreadId={activeThreadId}
            loading={loading}
            error={error}
            onSelect={handleSelectThread}
          />
        ) : activeThreadId ? (
          <LinearIssueThreadChat
            issueId={issueId}
            threadId={activeThreadId}
            composerContextItems={composerContextItems}
          />
        ) : loading ? (
          <div className="linear-thread-empty-chat">
            <p className="linear-thread-list-status">Loading threads…</p>
          </div>
        ) : (
          <LinearIssueThreadChat
            issueId={issueId}
            threadId={null}
            composerContextItems={composerContextItems}
            onStartThread={handleStartThreadWithMessage}
            starting={creatingThread}
          />
        )}
      </div>
    </div>
  );
}
