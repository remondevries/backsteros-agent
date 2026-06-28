import { useEffect, useRef, useState } from "react";
import type { OverflowDeleteBreadcrumbAction } from "./contentPanelNavigation";

function DocumentBreadcrumbMoreIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M8 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM1.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm13 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ContentPanelBreadcrumbOverflowMenu({
  action,
  menuLabel = "Options",
}: {
  action: OverflowDeleteBreadcrumbAction;
  menuLabel?: string;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (anchorRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  return (
    <div className="content-panel-breadcrumb-menu-anchor" ref={anchorRef}>
      <button
        type="button"
        className={[
          "content-panel-breadcrumb-menu-trigger",
          open ? "content-panel-breadcrumb-menu-trigger--open" : null,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={menuLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={action.deleting}
        onClick={() => setOpen((current) => !current)}
      >
        <DocumentBreadcrumbMoreIcon />
      </button>
      {open ? (
        <div
          className="content-panel-breadcrumb-menu"
          role="menu"
          aria-label={menuLabel}
        >
          <button
            type="button"
            className="content-panel-breadcrumb-menu-item content-panel-breadcrumb-menu-item--danger"
            role="menuitem"
            disabled={action.deleting}
            onClick={() => {
              setOpen(false);
              action.onDelete();
            }}
          >
            {action.deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function DocumentBreadcrumbMenu({
  action,
}: {
  action: OverflowDeleteBreadcrumbAction;
}) {
  return <ContentPanelBreadcrumbOverflowMenu action={action} menuLabel="Document options" />;
}
