import { useLayoutEffect, useRef, type ReactNode } from "react";
import { CalendarIcon } from "./CalendarIcon";
import { formatMessageTimestamp } from "./formatMessageTimestamp";
import { LinearIcon } from "./LinearIcon";
import { ObsidianIcon } from "./ObsidianIcon";
import { WhoopIcon } from "./WhoopIcon";
import { ShimmerText } from "./ShimmerText";
import type { ToolCategory } from "./types";

function ActivityStepIcon({ kind }: { kind: ToolCategory }) {
  if (kind === "notes") {
    return <ObsidianIcon size={16} />;
  }

  if (kind === "linear") {
    return <LinearIcon size={16} />;
  }

  if (kind === "calendar") {
    return <CalendarIcon size={16} />;
  }

  if (kind === "whoop") {
    return <WhoopIcon size={16} />;
  }

  return <>⚙</>;
}

export function ActivityStepRow({
  kind,
  label,
  status,
  durationMs,
}: {
  kind: ToolCategory;
  label: string;
  status: "running" | "completed" | "error";
  durationMs?: number;
}) {
  const statusIcon =
    status === "running" ? "…" : status === "completed" ? "✓" : "!";

  return (
    <div className="activity-step">
      <span className="activity-step-icon">
        {status === "running" ? (
          <ShimmerText className="text-shimmer-icon">
            <ActivityStepIcon kind={kind} />
          </ShimmerText>
        ) : (
          <ActivityStepIcon kind={kind} />
        )}
      </span>
      <span className="activity-step-label">
        {status === "running" ? <ShimmerText>{label}</ShimmerText> : label}
      </span>
      <span className="activity-step-status">{statusIcon}</span>
      {durationMs != null && (
        <span className="activity-step-duration">{Math.round(durationMs / 1000)}s</span>
      )}
    </div>
  );
}

export function ActivityHeader({
  durationMs,
  expanded,
  onToggle,
  running,
  sentAt,
}: {
  durationMs?: number;
  expanded: boolean;
  onToggle: () => void;
  running: boolean;
  sentAt?: number;
}) {
  const label = running
    ? "Working…"
    : durationMs != null
      ? `Worked for ${Math.max(1, Math.round(durationMs / 1000))} seconds`
      : "Activity";

  return (
    <button type="button" className="activity-header" onClick={onToggle}>
      <span className={`chevron ${expanded ? "expanded" : ""}`}>▸</span>
      <span className="activity-header-label activity-header-label-default">
        {running ? <ShimmerText>{label}</ShimmerText> : label}
      </span>
      {sentAt != null && (
        <span className="activity-header-label activity-header-label-timestamp">
          {formatMessageTimestamp(sentAt)}
        </span>
      )}
    </button>
  );
}

export function ActivityTimeline({
  children,
  running = false,
  scrollKey = "",
}: {
  children: ReactNode;
  running?: boolean;
  scrollKey?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  useLayoutEffect(() => {
    if (!running) return;
    const el = scrollRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [running, scrollKey]);

  return (
    <div
      ref={scrollRef}
      className={`activity-timeline${running ? " activity-timeline-running" : ""}`}
      onScroll={() => {
        const el = scrollRef.current;
        if (!el) return;
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        stickToBottomRef.current = distanceFromBottom < 16;
      }}
    >
      {children}
    </div>
  );
}
