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
import { shouldRefreshLinearIssueFromAgentReply } from "../../lib/linearIssueAgentRefresh";
import { useLinearIssueCommentThread } from "../../hooks/useLinearIssueCommentThread";
import { useStickToBottom } from "../../hooks/useStickToBottom";
import { useTts } from "../../hooks/useTts";
import type { ChatMessage } from "../../chat/types";
import { useContentPanelNavigation } from "../contentPanelNavigation";
import { linearThreadCommentsToChatMessages } from "./linearThreadFormat";
import { pickLinearAgentStatusLabel } from "./linearAgentSessionFormat";

const noop = () => undefined;
const LINEAR_AGENT_THINKING_DELAY_MS = 500;

export type LinearIssueThreadChatHandle = {
  focusComposer: () => void;
};

export const LinearIssueThreadChat = forwardRef<
  LinearIssueThreadChatHandle,
  {
    issueId: string;
    threadId: string | null;
    composerContextItems?: ComposerContextItem[];
    onStartThread?: (body: string) => Promise<boolean>;
    onDeleteThread?: () => Promise<boolean>;
    starting?: boolean;
    awaitAgentReplyOnMount?: boolean;
    onAwaitAgentReplyStarted?: () => void;
    onThreadUnavailable?: () => void;
  }
>(function LinearIssueThreadChat(
  {
    issueId,
    threadId,
    composerContextItems = [],
    onStartThread,
    onDeleteThread,
    starting = false,
    awaitAgentReplyOnMount = false,
    onAwaitAgentReplyStarted,
    onThreadUnavailable,
  },
  ref,
) {
  const { requestLinearIssueRefresh } = useContentPanelNavigation();
  const issueRefreshedForAssistantMessageIdsRef = useRef<Set<string>>(new Set());

  const refreshIssueForAgentMessage = useCallback(
    (messageId: string, text: string) => {
      if (issueRefreshedForAssistantMessageIdsRef.current.has(messageId)) return;
      if (!shouldRefreshLinearIssueFromAgentReply(text)) return;
      issueRefreshedForAssistantMessageIdsRef.current.add(messageId);
      requestLinearIssueRefresh();
    },
    [requestLinearIssueRefresh],
  );

  const handleSubstantiveAgentReply = useCallback(() => {
    requestLinearIssueRefresh();
  }, [requestLinearIssueRefresh]);

  const handleAgentPollSettled = useCallback(() => {
    requestLinearIssueRefresh();
  }, [requestLinearIssueRefresh]);

  const { comments, viewerId, loading, sending, awaitingAgentReply, agentSessionSnapshot, error, sendReply, beginAwaitingAgentReply, refresh } =
    useLinearIssueCommentThread(issueId, threadId, true, {
      onAgentPollSettled: handleAgentPollSettled,
      onSubstantiveAgentReply: handleSubstantiveAgentReply,
      onThreadUnavailable,
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
      const started = await onStartThread(trimmed);
      if (started) {
        setInput("");
        pinTranscriptScroll();
        composerRef.current?.focus();
      }
      return;
    }

    if (sending) return;
    pinTranscriptScroll();
    const sent = await sendReply(trimmed);
    if (sent) {
      setInput("");
      pinTranscriptScroll();
      composerRef.current?.focus();
    }
  }, [handleDeleteConversation, input, onStartThread, pinTranscriptScroll, sendReply, sending, starting, threadId]);

  const busy = deletingThread || (threadId ? sending : starting);

  useEffect(() => {
    const hydrated = hydratedMessageIdsRef.current;
    if (!hydrated) return;

    for (const message of visibleMessages) {
      if (message.role !== "assistant") continue;
      if (hydrated.has(message.id)) continue;
      refreshIssueForAgentMessage(message.id, message.text);
    }
  }, [visibleMessages, refreshIssueForAgentMessage]);

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
                  <div key={message.id} className="chat-turn">
                    <LinearAssistantBlock
                      messageId={message.id}
                      text={message.text}
                      sentAt={message.createdAt}
                      animate={shouldAnimateAssistant(message)}
                      canSpeak={ttsSupported && message.text.trim().length > 0}
                      onAgentReplyComplete={() => {
                        refreshIssueForAgentMessage(message.id, message.text);
                      }}
                    />
                  </div>
                ) : (
                  <ChatTurn
                    key={message.id}
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
