import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
  type RefObject,
} from "react";
import { LinearAssigneeAvatar } from "../../chat/LinearAssigneeAvatar";
import { LinearIcon } from "../../chat/LinearIcon";
import type { LinearCommentThreadSummary } from "../../lib/api";
import {
  buildLinearThreadRootBodyForSave,
  formatLinearThreadCardTime,
  linearThreadRootBodyForEditing,
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

function ThreadEditIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M11.13 1.87a1.25 1.25 0 0 1 1.77 1.77l-8.2 8.2-2.45.68.68-2.45 8.2-8.2Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.25"
      />
      <path
        d="M9.5 3.5 12.5 6.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.25"
      />
    </svg>
  );
}

function ThreadDeleteIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M2.75 4.5h10.5M6.25 4.5V3.25a.75.75 0 0 1 .75-.75h2a.75.75 0 0 1 .75.75V4.5m1.5 0v8.25a.75.75 0 0 1-.75.75h-5.5a.75.75 0 0 1-.75-.75V4.5h7.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.25"
      />
    </svg>
  );
}

const LinearThreadCardPreview = memo(function LinearThreadCardPreview({ text }: { text: string }) {
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
});

type ThreadExitPhase = "slide-out" | "collapse";

type ThreadExitState = {
  thread: LinearCommentThreadSummary;
  phase: ThreadExitPhase;
  order: number;
};

const LinearThreadListItem = memo(function LinearThreadListItem({
  thread,
  order,
  exitPhase,
  activeThreadId,
  editingThreadId,
  editDraft,
  busyThreadId,
  editInputRef,
  onSelect,
  onEdit,
  onDelete,
  startEdit,
  saveEdit,
  cancelEdit,
  cancelEditRef,
  setEditDraft,
  onSlideOutComplete,
  onCollapseComplete,
}: {
  thread: LinearCommentThreadSummary;
  order: number;
  exitPhase: ThreadExitPhase | null;
  activeThreadId: string | null;
  editingThreadId: string | null;
  editDraft: string;
  busyThreadId: string | null;
  editInputRef: RefObject<HTMLInputElement | null>;
  onSelect: (threadId: string) => void;
  onEdit?: (threadId: string, body: string) => Promise<boolean>;
  onDelete?: (threadId: string) => Promise<void>;
  startEdit: (thread: LinearCommentThreadSummary) => void;
  saveEdit: (thread: LinearCommentThreadSummary) => Promise<void>;
  cancelEdit: () => void;
  cancelEditRef: MutableRefObject<boolean>;
  setEditDraft: (value: string) => void;
  onSlideOutComplete: (threadId: string) => void;
  onCollapseComplete: (threadId: string) => void;
}) {
  const itemRef = useRef<HTMLLIElement>(null);
  const timestamp = formatLinearThreadCardTime(thread.createdAt);
  const isEditing = editingThreadId === thread.id;
  const isBusy = busyThreadId === thread.id;
  const isExiting = exitPhase !== null;

  const handleSlideAnimationEnd = useCallback(
    (event: React.AnimationEvent<HTMLDivElement>) => {
      if (event.animationName !== "linear-thread-card-exit-slide") return;
      onSlideOutComplete(thread.id);
    },
    [onSlideOutComplete, thread.id],
  );

  const handleCollapseAnimationEnd = useCallback(
    (event: React.AnimationEvent<HTMLLIElement>) => {
      if (event.target !== event.currentTarget) return;
      if (event.animationName !== "linear-thread-list-item-collapse") return;
      onCollapseComplete(thread.id);
    },
    [onCollapseComplete, thread.id],
  );

  useEffect(() => {
    if (exitPhase !== "collapse") return;
    const item = itemRef.current;
    if (!item) return;
    const height = item.getBoundingClientRect().height;
    item.style.setProperty("--linear-thread-list-item-collapse-height", `${height}px`);
  }, [exitPhase]);

  return (
    <li
      ref={itemRef}
      className={[
        "linear-thread-list-item",
        exitPhase === "collapse" ? "linear-thread-list-item--collapse" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-thread-order={order}
      onAnimationEnd={handleCollapseAnimationEnd}
    >
      <div
        className={[
          "linear-thread-card",
          activeThreadId === thread.id ? "linear-thread-card-active" : "",
          isEditing ? "linear-thread-card-editing" : "",
          isBusy && !isExiting ? "linear-thread-card-busy" : "",
          exitPhase === "slide-out" ? "linear-thread-card-exit-slide" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onAnimationEnd={handleSlideAnimationEnd}
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

        {isEditing ? (
          <input
            ref={editInputRef}
            type="text"
            className="linear-thread-card-edit-input"
            value={editDraft}
            disabled={isBusy}
            aria-label="Edit thread message"
            onChange={(event) => setEditDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void saveEdit(thread);
              }
              if (event.key === "Escape") {
                event.preventDefault();
                cancelEdit();
              }
            }}
            onBlur={() => {
              if (cancelEditRef.current) {
                cancelEditRef.current = false;
                return;
              }
              void saveEdit(thread);
            }}
          />
        ) : (
          <button
            type="button"
            className="linear-thread-card-main"
            onClick={() => onSelect(thread.id)}
            disabled={isExiting}
          >
            <LinearThreadCardPreview text={summarizeThreadBody(thread.body)} />
          </button>
        )}

        <div className="linear-thread-card-meta">
          <time className="linear-thread-card-time" dateTime={thread.createdAt} title={timestamp}>
            {timestamp}
          </time>
          {!isEditing && onEdit && onDelete && !isExiting ? (
            <div className="linear-thread-card-actions">
              <button
                type="button"
                className="linear-thread-card-action linear-thread-card-action-edit"
                aria-label="Edit thread"
                title="Edit thread"
                disabled={Boolean(busyThreadId)}
                onClick={(event) => {
                  event.stopPropagation();
                  startEdit(thread);
                }}
              >
                <ThreadEditIcon />
              </button>
              <button
                type="button"
                className="linear-thread-card-action linear-thread-card-action-danger"
                aria-label="Delete thread"
                title="Delete thread"
                disabled={Boolean(busyThreadId)}
                onClick={(event) => {
                  event.stopPropagation();
                  if (onDelete) void onDelete(thread.id);
                }}
              >
                <ThreadDeleteIcon />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
});

export function LinearIssueThreadList({
  threads,
  activeThreadId,
  loading,
  error,
  onSelect,
  onEdit,
  onDelete,
}: {
  threads: LinearCommentThreadSummary[];
  activeThreadId: string | null;
  loading: boolean;
  error: string | null;
  onSelect: (threadId: string) => void;
  onEdit?: (threadId: string, body: string) => Promise<boolean>;
  onDelete?: (threadId: string) => Promise<boolean>;
}) {
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [busyThreadId, setBusyThreadId] = useState<string | null>(null);
  const [exitingThreads, setExitingThreads] = useState<Record<string, ThreadExitState>>({});
  const editInputRef = useRef<HTMLInputElement>(null);
  const cancelEditRef = useRef(false);

  useEffect(() => {
    if (!editingThreadId) return;
    editInputRef.current?.focus();
    editInputRef.current?.select();
  }, [editingThreadId]);

  const cancelEdit = useCallback(() => {
    cancelEditRef.current = true;
    setEditingThreadId(null);
    setEditDraft("");
  }, []);

  const startEdit = useCallback((thread: LinearCommentThreadSummary) => {
    setEditingThreadId(thread.id);
    setEditDraft(linearThreadRootBodyForEditing(thread.body));
  }, []);

  const saveEdit = useCallback(
    async (thread: LinearCommentThreadSummary) => {
      if (!onEdit || busyThreadId) return;
      const body = buildLinearThreadRootBodyForSave(thread.body, editDraft);
      if (!body) return;

      setBusyThreadId(thread.id);
      try {
        const saved = await onEdit(thread.id, body);
        if (saved) {
          setEditingThreadId(null);
          setEditDraft("");
        }
      } finally {
        setBusyThreadId(null);
      }
    },
    [busyThreadId, editDraft, onEdit],
  );

  const handleSlideOutComplete = useCallback((threadId: string) => {
    setExitingThreads((current) => {
      const entry = current[threadId];
      if (!entry) return current;
      return { ...current, [threadId]: { ...entry, phase: "collapse" } };
    });
  }, []);

  const handleCollapseComplete = useCallback((threadId: string) => {
    setExitingThreads((current) => {
      if (!current[threadId]) return current;
      const next = { ...current };
      delete next[threadId];
      return next;
    });
    setBusyThreadId((current) => (current === threadId ? null : current));
  }, []);

  const handleDelete = useCallback(
    (threadId: string) => {
      if (!onDelete || busyThreadId || exitingThreads[threadId]) return;
      const thread = threads.find((entry) => entry.id === threadId);
      if (!thread) return;

      const confirmed = window.confirm("Delete this thread and all of its replies?");
      if (!confirmed) return;

      if (editingThreadId === threadId) {
        cancelEdit();
      }

      const order = threads.findIndex((entry) => entry.id === threadId);
      setBusyThreadId(threadId);
      setExitingThreads((current) => ({
        ...current,
        [threadId]: { thread, phase: "slide-out", order },
      }));

      void onDelete(threadId).then((succeeded) => {
        if (succeeded) return;
        setExitingThreads((current) => {
          if (!current[threadId]) return current;
          const next = { ...current };
          delete next[threadId];
          return next;
        });
        setBusyThreadId(null);
      });
    },
    [busyThreadId, cancelEdit, editingThreadId, exitingThreads, onDelete, threads],
  );

  const displayItems = useMemo(() => {
    const items = threads.map((thread, index) => ({
      thread,
      order: exitingThreads[thread.id]?.order ?? index,
      exitPhase: exitingThreads[thread.id]?.phase ?? null,
    }));

    for (const entry of Object.values(exitingThreads)) {
      if (threads.some((thread) => thread.id === entry.thread.id)) continue;
      items.push({
        thread: entry.thread,
        order: entry.order,
        exitPhase: entry.phase,
      });
    }

    return items.sort((left, right) => left.order - right.order);
  }, [exitingThreads, threads]);

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
      {displayItems.map(({ thread, order, exitPhase }) => (
        <LinearThreadListItem
          key={thread.id}
          thread={thread}
          order={order}
          exitPhase={exitPhase}
          activeThreadId={activeThreadId}
          editingThreadId={editingThreadId}
          editDraft={editDraft}
          busyThreadId={busyThreadId}
          editInputRef={editInputRef}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete ? handleDelete : undefined}
          startEdit={startEdit}
          saveEdit={saveEdit}
          cancelEdit={cancelEdit}
          cancelEditRef={cancelEditRef}
          setEditDraft={setEditDraft}
          onSlideOutComplete={handleSlideOutComplete}
          onCollapseComplete={handleCollapseComplete}
        />
      ))}
    </ul>
  );
}
