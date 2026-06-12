import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useLinearIssueCommentThread } from "../../hooks/useLinearIssueCommentThread";

function stripLinearAgentPrefix(body: string): string {
  return body.replace(/^@linear\s*/i, "").trim();
}

function LinearThreadMessage({
  body,
  isUser,
}: {
  body: string;
  isUser: boolean;
}) {
  const text = stripLinearAgentPrefix(body);
  if (!text) return null;

  return (
    <div
      className={`linear-thread-message${isUser ? " linear-thread-message-user" : " linear-thread-message-agent"}`}
    >
      <div className="linear-thread-message-bubble">{text}</div>
    </div>
  );
}

export function LinearIssueThreadChat({
  issueId,
  threadId,
}: {
  issueId: string;
  threadId: string;
}) {
  const { comments, viewerId, loading, sending, error, sendReply } =
    useLinearIssueCommentThread(issueId, threadId);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [comments.length, sending]);

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    const sent = await sendReply(trimmed);
    if (sent) {
      setInput("");
      textareaRef.current?.focus();
    }
  }, [input, sendReply, sending]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  if (loading && comments.length === 0) {
    return <p className="linear-thread-list-status">Loading thread…</p>;
  }

  return (
    <div className="linear-thread-chat">
      <div ref={scrollRef} className="linear-thread-chat-transcript">
        {comments.map((comment) => (
          <LinearThreadMessage
            key={comment.id}
            body={comment.body}
            isUser={Boolean(viewerId && comment.author.id === viewerId)}
          />
        ))}
        {sending ? <p className="linear-thread-chat-pending">Sending…</p> : null}
      </div>
      {error ? <p className="linear-thread-chat-error">{error}</p> : null}
      <form
        className="linear-thread-chat-composer"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <textarea
          ref={textareaRef}
          className="linear-thread-chat-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Reply in this thread…"
          rows={2}
          disabled={sending}
        />
        <button
          type="submit"
          className="linear-thread-chat-send"
          disabled={sending || !input.trim()}
          aria-label="Send reply"
        >
          Send
        </button>
      </form>
    </div>
  );
}
