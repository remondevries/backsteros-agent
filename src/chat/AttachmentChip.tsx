import type { KeyboardEvent } from "react";
import type { MessageAttachment, PendingAttachment } from "./types";

export function AttachmentChip({
  attachment,
  onRemove,
  onOpen,
}: {
  attachment: PendingAttachment | MessageAttachment;
  onRemove?: () => void;
  onOpen?: () => void;
}) {
  const name = attachment.name;
  const previewUrl =
    "previewUrl" in attachment && attachment.previewUrl ? attachment.previewUrl : undefined;
  const kind =
    "kind" in attachment
      ? attachment.kind
      : previewUrl
        ? "image"
        : "binary";

  const content = (
    <>
      {kind === "image" && previewUrl ? (
        <img className="attachment-chip-image" src={previewUrl} alt={name} />
      ) : (
        <span className="attachment-chip-icon">📎</span>
      )}
      <span className="attachment-chip-name">{name}</span>
      {onRemove && (
        <button
          type="button"
          className="attachment-chip-remove"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${name}`}
        >
          ×
        </button>
      )}
    </>
  );

  if (!onOpen) {
    return <div className="attachment-chip">{content}</div>;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen?.();
    }
  }

  return (
    <div
      className="attachment-chip attachment-chip-button"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      aria-label={`Preview ${name}`}
    >
      {content}
    </div>
  );
}
