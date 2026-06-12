import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatTurn } from "../../chat/ChatTurn";
import { Composer, type ComposerHandle } from "../../chat/Composer";
import { ComposerContextCard } from "../../chat/ComposerContextCard";
import { LinearAssistantBlock } from "../../chat/LinearAssistantBlock";
import type { ComposerContextItem } from "../../lib/chatFocusContext";
import { useLinearIssueCommentThread } from "../../hooks/useLinearIssueCommentThread";
import { useTts } from "../../hooks/useTts";
import type { ChatMessage } from "../../chat/types";
import type { AppView } from "../appViews";
import { linearCommentToChatMessage } from "./linearThreadFormat";

const noop = () => undefined;

export function LinearIssueThreadChat({
  issueId,
  threadId,
  composerContextItems = [],
  onNavigateToView,
}: {
  issueId: string;
  threadId: string;
  composerContextItems?: ComposerContextItem[];
  onNavigateToView?: (view: AppView) => void;
}) {
  const { comments, viewerId, loading, sending, error, sendReply } =
    useLinearIssueCommentThread(issueId, threadId);
  const { supported: ttsSupported } = useTts({ isActive: true });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<ComposerHandle>(null);
  const hydratedMessageIdsRef = useRef<Set<string> | null>(null);

  const messages = useMemo(
    () =>
      comments
        .map((comment) => linearCommentToChatMessage(comment, viewerId))
        .filter((message) => message.text.trim().length > 0),
    [comments, viewerId],
  );

  useEffect(() => {
    hydratedMessageIdsRef.current = null;
  }, [threadId]);

  useEffect(() => {
    if (loading || hydratedMessageIdsRef.current !== null) return;
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
    if (!trimmed || sending) return;
    const sent = await sendReply(trimmed);
    if (sent) {
      setInput("");
      composerRef.current?.focus();
    }
  }, [input, sendReply, sending]);

  const openLinearDashboard = useCallback(() => {
    onNavigateToView?.("linear");
  }, [onNavigateToView]);

  const openWhoopDashboard = useCallback(() => {
    onNavigateToView?.("whoop");
  }, [onNavigateToView]);

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
                      onOpenLinearDashboard={openLinearDashboard}
                      onOpenWhoopDashboard={openWhoopDashboard}
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
                    onOpenLinearDashboard={openLinearDashboard}
                    onOpenWhoopDashboard={openWhoopDashboard}
                    onFlowPresentationComplete={noop}
                  />
                ),
              )}
              {sending ? (
                <p className="linear-thread-chat-pending">Sending…</p>
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
            running={sending}
            disabled={sending}
            attachments={[]}
            onAddAttachments={noop}
            onRemoveAttachment={noop}
            hideToolIndicators
            focusPlaceholder="Reply in this thread…"
          />
        </div>
      </div>
    </div>
  );
}
