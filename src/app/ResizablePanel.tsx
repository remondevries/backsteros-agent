import type { ReactNode } from "react";
import { useResizablePanel } from "./useResizablePanel";

export function ResizablePanel({
  side,
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
  className,
  ariaLabel,
  collapsed = false,
  children,
}: {
  side: "left" | "right";
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
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

  return (
    <aside
      className={panelClass}
      style={{ width: collapsed ? 0 : width }}
      aria-label={ariaLabel}
      aria-hidden={collapsed || undefined}
      hidden={collapsed || undefined}
    >
      <div className="app-resizable-panel-content">{children}</div>
      {!collapsed ? (
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
