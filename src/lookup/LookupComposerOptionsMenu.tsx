import { useEffect, useRef, useState } from "react";
import type { LookupOutputFormat } from "./lookupOutputFormat";
import { LookupOutputFormatToggle } from "./LookupOutputFormatToggle";
import { LookupSearchModeToggle } from "./LookupSearchModeToggle";
import type { LookupSearchMode } from "./lookupSearchMode";

export function LookupComposerOptionsMenu({
  disabled,
  searchMode,
  onSearchModeChange,
  outputFormat,
  onOutputFormatChange,
  onUpload,
}: {
  disabled?: boolean;
  searchMode: LookupSearchMode;
  onSearchModeChange: (mode: LookupSearchMode) => void;
  outputFormat: LookupOutputFormat;
  onOutputFormatChange: (format: LookupOutputFormat) => void;
  onUpload: () => void;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (anchorRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  function handleUpload() {
    onUpload();
    setOpen(false);
  }

  return (
    <div className="lookup-composer-options-anchor" ref={anchorRef}>
      <button
        type="button"
        className={`composer-icon-button composer-attach lookup-composer-options-trigger ${open ? "active" : ""}`}
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        aria-label="Lookup options"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Uploads, format, and type"
      >
        <svg className="composer-attach-icon" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M8 3.5v9M3.5 8h9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div className="lookup-composer-options-menu" role="menu" aria-label="Lookup options">
          <button
            type="button"
            className="lookup-composer-options-item"
            role="menuitem"
            onClick={handleUpload}
          >
            <span className="lookup-composer-options-item-label">Uploads</span>
            <span className="lookup-composer-options-item-hint">PDF, images, audio…</span>
          </button>

          <div className="lookup-composer-options-item lookup-composer-options-item-row">
            <span className="lookup-composer-options-item-label">Format</span>
            <LookupOutputFormatToggle
              format={outputFormat}
              onChange={onOutputFormatChange}
              disabled={disabled}
            />
          </div>

          <div className="lookup-composer-options-item lookup-composer-options-item-row">
            <span className="lookup-composer-options-item-label">Type</span>
            <LookupSearchModeToggle
              mode={searchMode}
              onChange={onSearchModeChange}
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}
