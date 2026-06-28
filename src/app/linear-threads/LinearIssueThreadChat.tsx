import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from "react";
import { ScrollToBottomButton } from "../../chat/ScrollToBottomButton";
import { ChatTurn } from "../../chat/ChatTurn";
import { Composer, type ComposerHandle } from "../../chat/Composer";
import { ComposerContextCard } from "../../chat/ComposerContextCard";
import { parseLinearThreadChatCommand } from "../../chat/chatCommands";
import { LinearAssistantBlock, LinearThinkingBlock } from "../../chat/LinearAssistantBlock";
import {
  isSlashCommandPaletteOpen,
  type SlashCommandDefinition,
} from "../../chat/slashCommands";
import type { ComposerContextItem } from "../../lib/chatFocusContext";
import { buildChatFocusContext } from "../../lib/chatFocusContext";
import { applyAgentContentSideEffects } from "../../lib/linearContentListSync";
import { notifyLinearDocumentListChange } from "../../lib/linearDocumentListEvents";
import { useLinearCommentThread, type LinearCommentThreadSeed } from "../../hooks/useLinearIssueCommentThread";
import type { LinearCommentTarget } from "../../lib/linearCommentTarget";
import { useStickToBottom } from "../../hooks/useStickToBottom";
import { useTts } from "../../hooks/useTts";
import type { ChatMessage } from "../../chat/types";
import { useContentPanelNavigation, useFocusContent } from "../contentPanelNavigation";
import { linearThreadCommentsToChatMessages } from "./linearThreadFormat";
import { pickLinearAgentStatusLabel } from "./linearAgentSessionFormat";

const noop = () => undefined;
const LINEAR_AGENT_THINKING_DELAY_MS = 300;

function linearThreadMessageKey(message: ChatMessage): string {
  if (message.role === "user") {
    return `user:${message.createdAt}:${message.text}`;
  }
  return message.id;
}

export type LinearIssueThreadChatHandle = {
  focusComposer: () => void;
};

export const LinearIssueThreadChat = forwardRef<
  LinearIssueThreadChatHandle,
  {
    target: LinearCommentTarget;
    threadId: string | null;
    composerContextItems?: ComposerContextItem[];
    onStartThread?: (body: string) => Promise<boolean>;
    onDeleteThread?: () => Promise<boolean>;
    starting?: boolean;
    awaitAgentReplyOnMount?: boolean;
    onAwaitAgentReplyStarted?: () => void;
    onThreadUnavailable?: () => void;
    seedThread?: LinearCommentThreadSeed | null;
  }
>(function LinearIssueThreadChat(
  {
    target,
    threadId,
    composerContextItems = [],
    onStartThread,
    onDeleteThread,
    starting = false,
    awaitAgentReplyOnMount = false,
    onAwaitAgentReplyStarted,
    onThreadUnavailable,
    seedThread = null,
  },
  ref,
) {
  const {
    requestLinearIssueRefresh,
    activeLinearIssue,
    activeLinearDocument,
    activeVaultDocument,
    activeVaultFolder,
    linearSelection,
    linearWorkspaceView,
  } = useContentPanelNavigation();
  const { focusContentSnapshot } = useFocusContent();
  const issueRefreshedForAssistantMessageIdsRef = useRef<Set<string>>(new Set());

  const agentFocusContext = useMemo(
    () =>
      buildChatFocusContext({
        activeLinearIssue: target.kind === "issue" ? activeLinearIssue : null,
        activeLinearDocument: target.kind === "document" ? activeLinearDocument : null,
        activeVaultDocument: null,
        activeVaultFolder: null,
        linearSelection,
        linearWorkspaceView,
        focusContentSnapshot,
      }),
    [
      activeLinearDocument,
      activeLinearIssue,
      focusContentSnapshot,
      linearSelection,
      linearWorkspaceView,
      target.kind,
    ],
  );

  const refreshFocusedDocument = useCallback(() => {
    if (target.kind !== "document") return;
    const documentId = activeLinearDocument?.id ?? target.id;
    // #region agent log
    fetch("http://127.0.0.1:7933/ingest/280fb855-6de7-45c0-90bf-5ee8faee78a1", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "180d80" },
      body: JSON.stringify({
        sessionId: "180d80",
        hypothesisId: "DOC1",
        location: "LinearIssueThreadChat.tsx:refreshFocusedDocument",
        message: "Requesting linear document refresh",
        data: { documentId, targetId: target.id },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    notifyLinearDocumentListChange({ type: "refresh", documentId });
  }, [activeLinearDocument?.id, target]);

  const refreshContentForAgentMessage = useCallback(
    (messageId: string, text: string) => {
      if (issueRefreshedForAssistantMessageIdsRef.current.has(messageId)) return;
      issueRefreshedForAssistantMessageIdsRef.current.add(messageId);
      applyAgentContentSideEffects(text, agentFocusContext);
      if (target.kind === "document") {
        refreshFocusedDocument();
      }
    },
    [agentFocusContext, refreshFocusedDocument, target.kind],
  );

  const handleSubstantiveAgentReply = useCallback(() => {
    if (target.kind === "issue") {
      requestLinearIssueRefresh();
      return;
    }
    refreshFocusedDocument();
  }, [refreshFocusedDocument, requestLinearIssueRefresh, target.kind]);

  const handleAgentPollSettled = useCallback(() => {
    if (target.kind === "issue") {
      requestLinearIssueRefresh();
      return;
    }
    refreshFocusedDocument();
  }, [refreshFocusedDocument, requestLinearIssueRefresh, target.kind]);

  const { comments, viewerId, loading, sending, awaitingAgentReply, agentSessionSnapshot, error, sendReply, beginAwaitingAgentReply, refresh } =
    useLinearCommentThread(target, threadId, true, {
      onAgentPollSettled: handleAgentPollSettled,
      onSubstantiveAgentReply: handleSubstantiveAgentReply,
      onThreadUnavailable,
      seedThread,
    });
  const { supported: ttsSupported } = useTts({ isActive: true });
  const [input, setInput] = useState("");
  const [deletingThread, setDeletingThread] = useState(false);
  const {
    scrollRef,
    contentRef: transcriptInnerRef,
    handleScroll,
    pin: pinTranscriptScroll,
    scrollToBottom,
    showScrollButton,
  } = useStickToBottom();
  const composerRef = useRef<ComposerHandle>(null);
  const hydratedMessageIdsRef = useRef<Set<string> | null>(null);
  const observedInitialLoadRef = useRef(false);
  const beganAwaitOnMountRef = useRef(false);
  const [agentThinkingReady, setAgentThinkingReady] = useState(false);

  useEffect(() => {
    beganAwaitOnMountRef.current = false;
    issueRefreshedForAssistantMessageIdsRef.current = new Set();
  }, [threadId]);

  const messages = useMemo(
    () => linearThreadCommentsToChatMessages(comments, threadId, viewerId),
    [comments, threadId, viewerId],
  );

  const hasUserMessage = messages.some((message) => message.role === "user");
  const agentResponsePending = Boolean(threadId && awaitingAgentReply && hasUserMessage);

  useEffect(() => {
    setAgentThinkingReady(false);
  }, [threadId]);

  useEffect(() => {
    if (!agentResponsePending) {
      setAgentThinkingReady(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setAgentThinkingReady(true);
    }, LINEAR_AGENT_THINKING_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [agentResponsePending]);

  const visibleMessages = useMemo(() => {
    if (!hasUserMessage) {
      return messages.filter((message) => message.role === "user");
    }
    return messages;
  }, [hasUserMessage, messages]);

  useEffect(() => {
    if (!awaitAgentReplyOnMount || !threadId || loading || beganAwaitOnMountRef.current) return;
    if (!hasUserMessage) return;
    beganAwaitOnMountRef.current = true;
    beginAwaitingAgentReply();
    onAwaitAgentReplyStarted?.();
    void refresh();
  }, [
    awaitAgentReplyOnMount,
    beginAwaitingAgentReply,
    hasUserMessage,
    loading,
    onAwaitAgentReplyStarted,
    refresh,
    threadId,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      focusComposer: () => {
        composerRef.current?.focus();
      },
    }),
    [],
  );

  const showLinearThinking = agentResponsePending && agentThinkingReady;
  const linearThinkingStatusLabel = useMemo(
    () => pickLinearAgentStatusLabel(agentSessionSnapshot),
    [agentSessionSnapshot],
  );

  useEffect(() => {
    if (!showLinearThinking) return;
    pinTranscriptScroll();
  }, [pinTranscriptScroll, showLinearThinking]);

  useEffect(() => {
    hydratedMessageIdsRef.current = null;
    observedInitialLoadRef.current = false;
  }, [threadId]);

  useEffect(() => {
    if (loading) {
      observedInitialLoadRef.current = true;
      return;
    }
    if (!observedInitialLoadRef.current || hydratedMessageIdsRef.current !== null) return;
    hydratedMessageIdsRef.current = new Set(visibleMessages.map((message) => message.id));
  }, [loading, visibleMessages]);

  const shouldAnimateAssistant = useCallback((message: ChatMessage) => {
    const hydrated = hydratedMessageIdsRef.current;
    if (!hydrated) return false;
    return !hydrated.has(message.id);
  }, []);

  const handleDeleteConversation = useCallback(async () => {
    if (!onDeleteThread || deletingThread) return;
    setDeletingThread(true);
    try {
      await onDeleteThread();
    } finally {
      setDeletingThread(false);
      composerRef.current?.focus();
    }
  }, [deletingThread, onDeleteThread]);

  const handleSlashCommandSelect = useCallback(
    (command: SlashCommandDefinition) => {
      if (command.id === "clear") {
        setInput("");
        void handleDeleteConversation();
      }
    },
    [handleDeleteConversation],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key !== "Escape") return;
      if (!isSlashCommandPaletteOpen(composerRef.current?.getValue() ?? input, {
        context: "linear-thread",
      })) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setInput("");
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [input]);

  const handleSubmit = useCallback(async () => {
    const trimmed = (composerRef.current?.getValue() ?? input).trim();
    if (!trimmed) return;

    if (parseLinearThreadChatCommand(trimmed)) {
      setInput("");
      await handleDeleteConversation();
      return;
    }

    if (!threadId) {
      if (!onStartThread || starting) return;
      setInput("");
      pinTranscriptScroll();
      const started = await onStartThread(trimmed);
      if (started) {
        composerRef.current?.focus();
      }
      return;
    }

    if (sending) return;
    setInput("");
    pinTranscriptScroll();
    const sent = await sendReply(trimmed);
    if (sent) {
      pinTranscriptScroll();
      composerRef.current?.focus();
    }
  }, [handleDeleteConversation, input, onStartThread, pinTranscriptScroll, sendReply, sending, starting, threadId]);

  const busy = deletingThread || (!threadId && starting);

  useEffect(() => {
    const hydrated = hydratedMessageIdsRef.current;
    if (!hydrated) return;

    for (const message of visibleMessages) {
      if (message.role !== "assistant") continue;
      if (hydrated.has(message.id)) continue;
      refreshContentForAgentMessage(message.id, message.text);
    }
  }, [visibleMessages, refreshContentForAgentMessage]);

  return (
    <div className="chat-view chat-view--panel">
      <div className="chat-content">
        <div className="chat-transcript-shell">
          <ScrollToBottomButton
            visible={showScrollButton}
            onClick={() => scrollToBottom("smooth")}
          />
          <div ref={scrollRef} className="chat-transcript" onScroll={handleScroll}>
            <div className="chat-transcript-inner" ref={transcriptInnerRef}>
              {visibleMessages.map((message) =>
                message.role === "assistant" ? (
                  <div key={linearThreadMessageKey(message)} className="chat-turn">
                    <LinearAssistantBlock
                      messageId={message.id}
                      text={message.text}
                      sentAt={message.createdAt}
                      animate={shouldAnimateAssistant(message)}
                      canSpeak={ttsSupported && message.text.trim().length > 0}
                      onAgentReplyComplete={() => {
                        refreshContentForAgentMessage(message.id, message.text);
                      }}
                    />
                  </div>
                ) : (
                  <ChatTurn
                    key={linearThreadMessageKey(message)}
                    message={message}
                    animateMessage={false}
                    animateRun={false}
                    ttsSupported={ttsSupported}
                    voiceModeEnabled={false}
                    onOpenAttachmentPreview={noop}
                    onToggleRun={noop}
                    onApproveApproval={noop}
                    onRejectApproval={noop}
                    onRunPresentationComplete={noop}
                    onDeleteFileConfirm={noop}
                    onDeleteFileReturn={noop}
                    onFlowPresentationComplete={noop}
                  />
                ),
              )}
              {showLinearThinking ? (
                <div className="chat-turn">
                  <LinearThinkingBlock statusLabel={linearThinkingStatusLabel} />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        <div
          className={`composer-stack ${composerContextItems.length > 0 ? "composer-stack--has-context" : ""}`}
        >
          {composerContextItems.length > 0 ? (
            <ComposerContextCard items={composerContextItems} />
          ) : null}
          <Composer
            ref={composerRef}
            value={input}
            onChange={setInput}
            onSend={() => void handleSubmit()}
            onSlashCommandSelect={onDeleteThread ? handleSlashCommandSelect : undefined}
            slashCommandContext="linear-thread"
            running={busy}
            disabled={busy}
            attachments={[]}
            onAddAttachments={noop}
            onRemoveAttachment={noop}
            focusPlaceholder={threadId ? "Reply in this thread…" : "Send a message to start a thread…"}
          />
        </div>
      </div>
    </div>
  );
});
