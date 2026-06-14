import { useEffect, useRef } from "react";

export function DeleteNoteConfirmDialog({
  open,
  fileName,
  deleting,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  fileName: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    cancelButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onCancel();
        return;
      }

      const key = event.key.toLowerCase();
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;

      if (key === "c") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onCancel();
        return;
      }

      if (key === "d" && !deleting) {
        event.preventDefault();
        event.stopImmediatePropagation();
        onConfirm();
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [deleting, onCancel, onConfirm, open]);

  if (!open) return null;

  return (
    <div className="letter-modal-backdrop" onClick={deleting ? undefined : onCancel}>
      <div
        className="letter-modal delete-note-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-note-confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="delete-note-confirm-title" className="letter-modal-title">
          Delete note?
        </h2>
        <p className="letter-modal-body">
          This will permanently delete <strong>{fileName}</strong>. This action cannot be undone.
        </p>
        <div className="letter-modal-actions">
          <button
            ref={cancelButtonRef}
            type="button"
            className="letter-modal-button letter-modal-button-secondary"
            onClick={onCancel}
            disabled={deleting}
          >
            Cancel
            <span className="letter-modal-hotkey">C</span>
          </button>
          <button
            type="button"
            className="letter-modal-button delete-note-confirm-delete-btn"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
            <span className="letter-modal-hotkey">D</span>
          </button>
        </div>
      </div>
    </div>
  );
}
