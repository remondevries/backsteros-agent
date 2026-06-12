import { LinearAssigneeAvatar } from "../../chat/LinearAssigneeAvatar";
import type { LinearCommentThreadSummary } from "../../lib/api";
import {
  formatLinearThreadCardTime,
  summarizeThreadBody,
} from "./linearThreadFormat";

export function LinearIssueThreadList({
  threads,
  activeThreadId,
  loading,
  error,
  onSelect,
  onCreateThread,
  creatingThread = false,
}: {
  threads: LinearCommentThreadSummary[];
  activeThreadId: string | null;
  loading: boolean;
  error: string | null;
  onSelect: (threadId: string) => void;
  onCreateThread: () => void;
  creatingThread?: boolean;
}) {
  if (loading && threads.length === 0) {
    return (
      <div className="linear-thread-list-shell">
        <button
          type="button"
          className="linear-thread-new-card"
          onClick={onCreateThread}
          disabled={creatingThread}
        >
          {creatingThread ? "Starting conversation…" : "Start a new conversation"}
        </button>
        <p className="linear-thread-list-status">Loading threads…</p>
      </div>
    );
  }

  if (error && threads.length === 0) {
    return (
      <div className="linear-thread-list-shell">
        <button
          type="button"
          className="linear-thread-new-card"
          onClick={onCreateThread}
          disabled={creatingThread}
        >
          {creatingThread ? "Starting conversation…" : "Start a new conversation"}
        </button>
        <p className="linear-thread-list-status linear-thread-list-status-error">{error}</p>
      </div>
    );
  }

  return (
    <ul className="linear-thread-list">
      <li>
        <button
          type="button"
          className="linear-thread-new-card"
          onClick={onCreateThread}
          disabled={creatingThread}
        >
          {creatingThread ? "Starting conversation…" : "Start a new conversation"}
        </button>
      </li>
      {threads.map((thread) => {
        const timestamp = formatLinearThreadCardTime(thread.createdAt);
        return (
          <li key={thread.id}>
            <button
              type="button"
              className={`linear-thread-card${activeThreadId === thread.id ? " linear-thread-card-active" : ""}`}
              onClick={() => onSelect(thread.id)}
            >
              <div className="linear-thread-card-avatar">
                <LinearAssigneeAvatar
                  name={thread.author.name}
                  avatarUrl={thread.author.avatarUrl ?? undefined}
                />
              </div>
              <p className="linear-thread-card-preview">{summarizeThreadBody(thread.body)}</p>
              <time
                className="linear-thread-card-time"
                dateTime={thread.createdAt}
                title={timestamp}
              >
                {timestamp}
              </time>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
