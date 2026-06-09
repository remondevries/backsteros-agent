import { useEffect, useState } from "react";
import type { AttachmentPreviewTarget } from "./types";

export function AttachmentPreviewModal({
  target,
  onClose,
}: {
  target: AttachmentPreviewTarget | null;
  onClose: () => void;
}) {
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    if (!target) {
      setTextContent(null);
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [target, onClose]);

  useEffect(() => {
    if (!target?.file || target.kind !== "text") {
      setTextContent(null);
      return;
    }

    let cancelled = false;
    void target.file
      .text()
      .then((content) => {
        if (!cancelled) {
          setTextContent(content);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTextContent(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [target]);

  if (!target) {
    return null;
  }

  const isImage = target.kind === "image" && target.previewUrl;

  if (isImage) {
    return (
      <div className="attachment-modal-backdrop" onClick={onClose}>
        <div
          className="attachment-modal attachment-modal-image-view"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${target.name}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="attachment-modal-image-shell">
            <img
              className="attachment-modal-image"
              src={target.previewUrl}
              alt={target.name}
            />
            <button
              type="button"
              className="attachment-modal-close attachment-modal-close-overlay"
              onClick={onClose}
              aria-label="Close preview"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="attachment-modal-backdrop" onClick={onClose}>
      <div
        className="attachment-modal attachment-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${target.name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="attachment-modal-header">
          <div className="attachment-modal-title">{target.name}</div>
          <button
            type="button"
            className="attachment-modal-close"
            onClick={onClose}
            aria-label="Close preview"
          >
            ×
          </button>
        </div>

        <div className="attachment-modal-body">
          {target.kind === "text" && textContent ? (
            <pre className="attachment-modal-text">{textContent}</pre>
          ) : (
            <div className="attachment-modal-meta">
              <div>{target.mimeType}</div>
              {target.vaultPath && <div>{target.vaultPath}</div>}
              {!target.previewUrl && target.kind === "image" && (
                <div className="muted">Image preview is not available for this attachment.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
