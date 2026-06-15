import type { ReactNode, RefObject } from "react";
import { useResizablePanel } from "./useResizablePanel";

export function ResizablePanel({
  id,
  side,
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
  containerRef,
  defaultWidthRatio,
  maxWidthRatio,
  resetWidthOnExpand = false,
  fitContent = false,
  className,
  ariaLabel,
  collapsed = false,
  children,
}: {
  id?: string;
  side: "left" | "right";
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  containerRef?: RefObject<HTMLElement | null>;
  defaultWidthRatio?: number;
  maxWidthRatio?: number;
  resetWidthOnExpand?: boolean;
  /** Shrink the panel to its content width (respects min/max). Hides the resize handle. */
  fitContent?: boolean;
  className?: string;
  ariaLabel?: string;
  collapsed?: boolean;
  children: ReactNode;
}) {
  const { width, isResizing, handleResizePointerDown } = useResizablePanel({
    side,
    storageKey,
    defaultWidth,
    minWidth,
    maxWidth,
    containerRef,
    defaultWidthRatio,
    maxWidthRatio,
    resetWidthOnExpand,
    expanded: !collapsed,
  });

  const panelClass = [
    "app-resizable-panel",
    side === "left" ? "app-resizable-panel-left" : "app-resizable-panel-right",
    isResizing ? "app-resizable-panel-resizing" : null,
    collapsed ? "app-resizable-panel-collapsed" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const panelStyle = collapsed
    ? { width: 0 }
    : fitContent
      ? { width: "fit-content" as const, minWidth, maxWidth }
      : { width };

  return (
    <aside
      id={id}
      className={panelClass}
      style={panelStyle}
      aria-label={ariaLabel}
      aria-hidden={collapsed || undefined}
      hidden={collapsed || undefined}
    >
      <div className="app-resizable-panel-content">{children}</div>
      {!collapsed && !fitContent ? (
        <div
          className="app-resizable-panel-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${side} panel`}
          onPointerDown={handleResizePointerDown}
        />
      ) : null}
    </aside>
  );
}
