import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createLinearIssueComment, deleteLinearIssueCommentThread, updateLinearIssueCommentThread } from "../../lib/api";
import { useLinearIssueCommentThreads } from "../../hooks/useLinearIssueCommentThreads";
import { composerContextItems as buildComposerContextItems } from "../../lib/chatFocusContext";
import { registerRightPanelComposerFocus } from "../../lib/rightPanelChatFocus";
import { useContentPanelNavigation, useFocusContent } from "../contentPanelNavigation";
import { LinearIssueThreadChat, type LinearIssueThreadChatHandle } from "./LinearIssueThreadChat";
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
  const [isDraftingNewThread, setIsDraftingNewThread] = useState(false);
  const [draftSessionKey, setDraftSessionKey] = useState(0);
  const [creatingThread, setCreatingThread] = useState(false);
  const [awaitAgentForThreadId, setAwaitAgentForThreadId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const threadChatRef = useRef<LinearIssueThreadChatHandle>(null);
  const pendingCreatedThreadIdRef = useRef<string | null>(null);

  const focusComposer = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        threadChatRef.current?.focusComposer();
      });
    });
  }, []);

  useEffect(() => {
    return registerRightPanelComposerFocus({
      focusComposer: () => {
        setPanelMode("chat");
        focusComposer();
      },
    });
  }, [focusComposer]);

  useEffect(() => {
    setPanelMode("chat");
    setActiveThreadId(readStoredThreadId(issueId));
    setIsDraftingNewThread(false);
    setDraftSessionKey(0);
    setActionError(null);
    pendingCreatedThreadIdRef.current = null;
  }, [issueId]);

  useEffect(() => {
    if (loading || isDraftingNewThread || creatingThread) return;

    const pendingThreadId = pendingCreatedThreadIdRef.current;
    if (pendingThreadId) {
      const pendingVisible = threads.some((thread) => thread.id === pendingThreadId);
      if (!pendingVisible) {
        return;
      }
      pendingCreatedThreadIdRef.current = null;
    }

    if (threads.length === 0) {
      setActiveThreadId(null);
      return;
    }

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
  }, [creatingThread, issueId, isDraftingNewThread, loading, threads]);

  const handleThreadUnavailable = useCallback(() => {
    setActiveThreadId((current) => {
      if (!current) return current;
      if (threads.some((thread) => thread.id === current)) return current;
      return threads[0]?.id ?? null;
    });
  }, [threads]);

  useEffect(() => {
    if (isDraftingNewThread) {
      writeStoredThreadId(issueId, null);
      return;
    }
    writeStoredThreadId(issueId, activeThreadId);
  }, [activeThreadId, issueId, isDraftingNewThread]);

  const handleSelectThread = useCallback((threadId: string) => {
    setIsDraftingNewThread(false);
    setActiveThreadId(threadId);
    setPanelMode("chat");
    setActionError(null);
  }, []);

  const handleToggleHistory = useCallback(() => {
    setPanelMode((current) => (current === "threads" ? "chat" : "threads"));
    setActionError(null);
  }, []);

  const handleEditThread = useCallback(
    async (threadId: string, body: string) => {
      setActionError(null);
      try {
        const result = await updateLinearIssueCommentThread(issueId, threadId, body);
        if (result.error || !result.comment) {
          setActionError(result.error ?? "Failed to update thread.");
          return false;
        }
        await refresh();
        return true;
      } catch {
        setActionError("Failed to update thread.");
        return false;
      }
    },
    [issueId, refresh],
  );

  const handleDeleteThread = useCallback(
    async (threadId: string) => {
      setActionError(null);
      try {
        const result = await deleteLinearIssueCommentThread(issueId, threadId);
        if (result.error || !result.success) {
          setActionError(result.error ?? "Failed to delete thread.");
          return false;
        }

        await refresh();
        setActiveThreadId((current) => (current === threadId ? null : current));
        return true;
      } catch {
        setActionError("Failed to delete thread.");
        return false;
      }
    },
    [issueId, refresh],
  );

  const handleStartNewThreadDraft = useCallback(() => {
    pendingCreatedThreadIdRef.current = null;
    setIsDraftingNewThread(true);
    setActiveThreadId(null);
    setAwaitAgentForThreadId(null);
    setDraftSessionKey((current) => current + 1);
    setPanelMode("chat");
    setActionError(null);
    focusComposer();
  }, [focusComposer]);

  const handleClearLinearConversation = useCallback(async () => {
    if (activeThreadId) {
      return handleDeleteThread(activeThreadId);
    }
    handleStartNewThreadDraft();
    return true;
  }, [activeThreadId, handleDeleteThread, handleStartNewThreadDraft]);

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

        const newThreadId = result.comment.id;
        pendingCreatedThreadIdRef.current = newThreadId;
        writeStoredThreadId(issueId, newThreadId);
        setActiveThreadId(newThreadId);
        setAwaitAgentForThreadId(newThreadId);
        setPanelMode("chat");
        setIsDraftingNewThread(false);
        await refresh();
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

  const viewingExistingThread = Boolean(activeThreadId) && !isDraftingNewThread;
  const hasThreadHistory = threads.length > 0;

  useEffect(() => {
    if (!hasThreadHistory && panelMode === "threads") {
      setPanelMode("chat");
    }
  }, [hasThreadHistory, panelMode]);

  return (
    <div className="right-side-panel-chat">
      <RightPanelChatHeader
        title={getRightPanelAgentLabel("linear")}
        agentId="linear"
        actions={
          <>
            {hasThreadHistory ? (
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
            ) : null}
            <button
              type="button"
              className="linear-thread-header-button"
              onClick={handleStartNewThreadDraft}
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
            onEdit={handleEditThread}
            onDelete={handleDeleteThread}
          />
        ) : viewingExistingThread && activeThreadId ? (
          <LinearIssueThreadChat
            key={activeThreadId}
            ref={threadChatRef}
            issueId={issueId}
            threadId={activeThreadId}
            composerContextItems={composerContextItems}
            awaitAgentReplyOnMount={activeThreadId === awaitAgentForThreadId}
            onAwaitAgentReplyStarted={() => setAwaitAgentForThreadId(null)}
            onThreadUnavailable={handleThreadUnavailable}
            onDeleteThread={handleClearLinearConversation}
          />
        ) : loading && threads.length > 0 && !isDraftingNewThread ? (
          <div className="linear-thread-empty-chat">
            <p className="linear-thread-list-status">Loading threads…</p>
          </div>
        ) : (
          <LinearIssueThreadChat
            key={`draft-new-thread-${draftSessionKey}`}
            ref={threadChatRef}
            issueId={issueId}
            threadId={null}
            composerContextItems={composerContextItems}
            onStartThread={handleStartThreadWithMessage}
            onDeleteThread={handleClearLinearConversation}
            starting={creatingThread}
          />
        )}
      </div>
    </div>
  );
}
