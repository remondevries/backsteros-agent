import { useEffect, useRef } from "react";

export function LetterUploadModal({
  open,
  onCancel,
  onUpload,
}: {
  open: boolean;
  onCancel: () => void;
  onUpload: () => void;
}) {
  const uploadButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    uploadButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key.toLowerCase() === "o" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        onUpload();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel, onUpload]);

  if (!open) return null;

  return (
    <div className="letter-modal-backdrop" onClick={onCancel}>
      <div
        className="letter-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="letter-upload-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="letter-upload-modal-title" className="letter-modal-title">
          Upload a letter first
        </h2>
        <p className="letter-modal-body">
          To file away a letter with <code>/letter</code>, attach a PDF first. Upload your letter,
          then the automation will read it and help you file it in your vault.
        </p>
        <div className="letter-modal-actions">
          <button type="button" className="letter-modal-button letter-modal-button-secondary" onClick={onCancel}>
            Cancel
            <span className="letter-modal-hotkey">Esc</span>
          </button>
          <button
            ref={uploadButtonRef}
            type="button"
            className="letter-modal-button letter-modal-button-primary"
            onClick={onUpload}
          >
            Upload letter
            <span className="letter-modal-hotkey">O</span>
          </button>
        </div>
      </div>
    </div>
  );
}
