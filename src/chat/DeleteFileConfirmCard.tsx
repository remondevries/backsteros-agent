export function DeleteFileConfirmActions({
  resolved,
  onConfirm,
  onReturn,
}: {
  resolved?: boolean;
  onConfirm: () => void;
  onReturn: () => void;
}) {
  if (resolved) {
    return null;
  }

  return (
    <div className="delete-file-confirm-actions">
      <button
        type="button"
        className="delete-file-confirm-btn delete-file-confirm-btn-return"
        onClick={onReturn}
      >
        No, thank you
        <span className="delete-file-confirm-hotkey">Ctrl+N</span>
      </button>
      <button
        type="button"
        className="delete-file-confirm-btn delete-file-confirm-btn-confirm"
        onClick={onConfirm}
      >
        Delete it
        <span className="delete-file-confirm-hotkey">Ctrl+D</span>
      </button>
    </div>
  );
}
