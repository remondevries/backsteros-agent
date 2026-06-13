import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatTurn } from "../../chat/ChatTurn";
import { Composer, type ComposerHandle } from "../../chat/Composer";
import { ComposerContextCard } from "../../chat/ComposerContextCard";
import { LinearAssistantBlock } from "../../chat/LinearAssistantBlock";
import type { ComposerContextItem } from "../../lib/chatFocusContext";
import { shouldRefreshLinearIssueFromAgentReply } from "../../lib/linearIssueAgentRefresh";
import { useLinearIssueCommentThread } from "../../hooks/useLinearIssueCommentThread";
import { useTts } from "../../hooks/useTts";
import type { ChatMessage } from "../../chat/types";
import { useContentPanelNavigation } from "../contentPanelNavigation";
import { linearCommentToChatMessage } from "./linearThreadFormat";

const noop = () => undefined;

export function LinearIssueThreadChat({
  issueId,
  threadId,
  composerContextItems = [],
  onStartThread,
  starting = false,
}: {
  issueId: string;
  threadId: string | null;
  composerContextItems?: ComposerContextItem[];
  onStartThread?: (body: string) => Promise<boolean>;
  starting?: boolean;
}) {
  const { requestLinearIssueRefresh } = useContentPanelNavigation();
  const awaitingAgentRef = useRef<{
    assistantIds: Set<string>;
    refreshedMessageIds: Set<string>;
  } | null>(null);

  const handleAgentPollSettled = useCallback(() => {
    if (!awaitingAgentRef.current) return;
    requestLinearIssueRefresh();
    awaitingAgentRef.current = null;
  }, [requestLinearIssueRefresh]);

  const { comments, viewerId, loading, sending, error, sendReply } =
    useLinearIssueCommentThread(issueId, threadId, true, {
      onAgentPollSettled: handleAgentPollSettled,
    });
  const { supported: ttsSupported } = useTts({ isActive: true });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<ComposerHandle>(null);
  const hydratedMessageIdsRef = useRef<Set<string> | null>(null);
  const observedInitialLoadRef = useRef(false);

  const messages = useMemo(
    () =>
      comments
        .map((comment) => linearCommentToChatMessage(comment, viewerId))
        .filter((message) => message.text.trim().length > 0),
    [comments, viewerId],
  );

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
    hydratedMessageIdsRef.current = new Set(messages.map((message) => message.id));
  }, [loading, messages]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages.length, sending]);

  const shouldAnimateAssistant = useCallback((message: ChatMessage) => {
    const hydrated = hydratedMessageIdsRef.current;
    if (!hydrated) return false;
    return !hydrated.has(message.id);
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (!threadId) {
      if (!onStartThread || starting) return;
      const started = await onStartThread(trimmed);
      if (started) {
        setInput("");
        composerRef.current?.focus();
      }
      return;
    }

    if (sending) return;
    awaitingAgentRef.current = {
      assistantIds: new Set(
        messages.filter((message) => message.role === "assistant").map((message) => message.id),
      ),
      refreshedMessageIds: new Set(),
    };
    const sent = await sendReply(trimmed);
    if (sent) {
      setInput("");
      composerRef.current?.focus();
      return;
    }
    awaitingAgentRef.current = null;
  }, [input, messages, onStartThread, sendReply, sending, starting, threadId]);

  const busy = threadId ? sending : starting;

  const maybeRefreshIssueFromAgentReply = useCallback(
    (message: ChatMessage) => {
      const pending = awaitingAgentRef.current;
      if (!pending || message.role !== "assistant") return;
      if (pending.assistantIds.has(message.id)) return;
      if (pending.refreshedMessageIds.has(message.id)) return;
      if (!shouldRefreshLinearIssueFromAgentReply(message.text)) return;

      pending.refreshedMessageIds.add(message.id);
      requestLinearIssueRefresh();
    },
    [requestLinearIssueRefresh],
  );

  useEffect(() => {
    const pending = awaitingAgentRef.current;
    if (!pending) return;

    for (const message of messages) {
      if (message.role !== "assistant") continue;
      if (pending.assistantIds.has(message.id)) continue;
      if (!shouldRefreshLinearIssueFromAgentReply(message.text)) continue;
      if (pending.refreshedMessageIds.has(message.id)) continue;
      pending.refreshedMessageIds.add(message.id);
      requestLinearIssueRefresh();
    }
  }, [messages, requestLinearIssueRefresh]);

  if (loading && messages.length === 0) {
    return <p className="linear-thread-list-status">Loading thread…</p>;
  }

  return (
    <div className="chat-view chat-view--panel">
      <div className="chat-content">
        <div className="chat-transcript-shell">
          <div ref={scrollRef} className="chat-transcript">
            <div className="chat-transcript-inner">
              {messages.map((message) =>
                message.role === "assistant" ? (
                  <div key={message.id} className="chat-turn">
                    <LinearAssistantBlock
                      messageId={message.id}
                      text={message.text}
                      sentAt={message.createdAt}
                      animate={shouldAnimateAssistant(message)}
                      canSpeak={ttsSupported && message.text.trim().length > 0}
                      onAgentReplyComplete={() => {
                        maybeRefreshIssueFromAgentReply(message);
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
              {busy ? (
                <p className="linear-thread-chat-pending">
                  {threadId ? "Sending…" : "Starting thread…"}
                </p>
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
            running={busy}
            disabled={busy}
            attachments={[]}
            onAddAttachments={noop}
            onRemoveAttachment={noop}
            hideToolIndicators
            focusPlaceholder={threadId ? "Reply in this thread…" : "Send a message to start a thread…"}
          />
        </div>
      </div>
    </div>
  );
}
