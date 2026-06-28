import {
  useCallback,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from "react";
import { isIosDevice } from "../../platform/iosStandalone";

const DELETE_ACTION_WIDTH_PX = 76;
const OPEN_THRESHOLD_PX = 40;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest("input, textarea, select, button, a, [contenteditable='true']"),
  );
}

export function WorkoutSwipeToDeleteShell({
  children,
  onDelete,
  disabled = false,
  deleteAriaLabel,
}: {
  children: ReactNode;
  onDelete: () => void;
  disabled?: boolean;
  deleteAriaLabel: string;
}) {
  const [offsetPx, setOffsetPx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartXRef = useRef(0);
  const touchStartOffsetRef = useRef(0);
  const offsetRef = useRef(0);
  const draggingRef = useRef(false);

  const clampOffset = useCallback((value: number) => {
    return Math.max(0, Math.min(DELETE_ACTION_WIDTH_PX, value));
  }, []);

  const setOffset = useCallback(
    (value: number) => {
      const next = clampOffset(value);
      offsetRef.current = next;
      setOffsetPx(next);
    },
    [clampOffset],
  );

  const snapOffset = useCallback(
    (value: number) => {
      if (value >= OPEN_THRESHOLD_PX) {
        setOffset(DELETE_ACTION_WIDTH_PX);
        return;
      }
      setOffset(0);
    },
    [setOffset],
  );

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (disabled || isEditableTarget(event.target)) {
      return;
    }
    const touch = event.touches[0];
    if (!touch) return;
    touchStartXRef.current = touch.clientX;
    touchStartOffsetRef.current = offsetRef.current;
    draggingRef.current = true;
    setDragging(true);
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (!draggingRef.current || disabled) return;
    const touch = event.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartXRef.current;
    const nextOffset = touchStartOffsetRef.current - deltaX;
    if (Math.abs(deltaX) > 8) {
      event.preventDefault();
    }
    setOffset(nextOffset);
  };

  const handleTouchEnd = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    snapOffset(offsetRef.current);
  };

  const handleDelete = () => {
    if (disabled) return;
    setOffset(0);
    onDelete();
  };

  return (
    <div
      className="workout-swipe-delete"
      data-open={offsetPx > 0 ? "true" : undefined}
      data-dragging={dragging ? "true" : undefined}
    >
      <div
        className="workout-swipe-delete__actions"
        aria-hidden={offsetPx === 0}
        style={{ width: offsetPx > 0 ? `${offsetPx}px` : "0px" }}
      >
        <button
          type="button"
          className="workout-swipe-delete__button"
          onClick={handleDelete}
          disabled={disabled}
          aria-label={deleteAriaLabel}
        >
          Delete
        </button>
      </div>
      <div
        className={[
          "workout-swipe-delete__content",
          dragging ? "workout-swipe-delete__content--dragging" : null,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ transform: `translate3d(${-offsetPx}px, 0, 0)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

export function WorkoutIssueRowShell({
  children,
  onDelete,
  disabled = false,
  deleteAriaLabel,
  deleteTitle,
}: {
  children: ReactNode;
  onDelete: () => void;
  disabled?: boolean;
  deleteAriaLabel: string;
  deleteTitle?: string;
}) {
  const swipeDelete = isIosDevice();

  if (swipeDelete) {
    return (
      <div className="workout-issue-row-shell workout-issue-row-shell--swipe-delete">
        <WorkoutSwipeToDeleteShell
          onDelete={onDelete}
          disabled={disabled}
          deleteAriaLabel={deleteAriaLabel}
        >
          {children}
        </WorkoutSwipeToDeleteShell>
      </div>
    );
  }

  return (
    <div className="workout-issue-row-shell">
      {children}
      <button
        type="button"
        className="workout-issue-delete"
        onClick={() => void onDelete()}
        disabled={disabled}
        aria-label={deleteAriaLabel}
        title={deleteTitle ?? deleteAriaLabel}
      >
        <WorkoutTrashIcon />
      </button>
    </div>
  );
}

function WorkoutTrashIcon() {
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
