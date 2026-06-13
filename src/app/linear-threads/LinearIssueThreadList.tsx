import { useEffect, useRef, useState, type CSSProperties } from "react";
import { LinearAssigneeAvatar } from "../../chat/LinearAssigneeAvatar";
import { LinearIcon } from "../../chat/LinearIcon";
import type { LinearCommentThreadSummary } from "../../lib/api";
import {
  formatLinearThreadCardTime,
  summarizeThreadBody,
} from "./linearThreadFormat";

function LinearThreadDirectionArrow() {
  return (
    <svg
      className="linear-thread-card-arrow"
      viewBox="0 0 12 12"
      width="12"
      height="12"
      aria-hidden="true"
    >
      <path
        d="M2.25 6h7m-2.5-2.5L9.25 6l-2.5 2.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.25"
      />
    </svg>
  );
}

function LinearThreadCardPreview({ text }: { text: string }) {
  const previewRef = useRef<HTMLParagraphElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [scrollDistance, setScrollDistance] = useState(0);

  useEffect(() => {
    const preview = previewRef.current;
    const textNode = textRef.current;
    if (!preview || !textNode) return undefined;

    const measure = () => {
      setScrollDistance(Math.max(0, textNode.scrollWidth - preview.clientWidth));
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(preview);
    resizeObserver.observe(textNode);

    return () => resizeObserver.disconnect();
  }, [text]);

  const style =
    scrollDistance > 0
      ? ({
          "--linear-thread-card-preview-scroll-distance": `${scrollDistance}px`,
          "--linear-thread-card-preview-scroll-duration": `${Math.min(
            12,
            Math.max(4, scrollDistance / 24),
          )}s`,
        } as CSSProperties)
      : undefined;

  return (
    <p
      ref={previewRef}
      className={`linear-thread-card-preview${
        scrollDistance > 0 ? " linear-thread-card-preview-overflowing" : ""
      }`}
      style={style}
    >
      <span ref={textRef} className="linear-thread-card-preview-text">
        {text}
      </span>
    </p>
  );
}

export function LinearIssueThreadList({
  threads,
  activeThreadId,
  loading,
  error,
  onSelect,
}: {
  threads: LinearCommentThreadSummary[];
  activeThreadId: string | null;
  loading: boolean;
  error: string | null;
  onSelect: (threadId: string) => void;
}) {
  if (loading && threads.length === 0) {
    return (
      <div className="linear-thread-list-shell">
        <p className="linear-thread-list-status">Loading threads…</p>
      </div>
    );
  }

  if (error && threads.length === 0) {
    return (
      <div className="linear-thread-list-shell">
        <p className="linear-thread-list-status linear-thread-list-status-error">{error}</p>
      </div>
    );
  }

  return (
    <ul className="linear-thread-list">
      {threads.map((thread) => {
        const timestamp = formatLinearThreadCardTime(thread.createdAt);
        return (
          <li key={thread.id}>
            <button
              type="button"
              className={`linear-thread-card${activeThreadId === thread.id ? " linear-thread-card-active" : ""}`}
              onClick={() => onSelect(thread.id)}
            >
              <div className="linear-thread-card-route" aria-label="User to Linear">
                <span className="linear-thread-card-avatar">
                  <LinearAssigneeAvatar
                    name={thread.author.name}
                    avatarUrl={thread.author.avatarUrl ?? undefined}
                  />
                </span>
                <LinearThreadDirectionArrow />
                <span className="linear-thread-card-linear" aria-hidden="true">
                  <LinearIcon size={13} />
                </span>
              </div>
              <LinearThreadCardPreview text={summarizeThreadBody(thread.body)} />
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
