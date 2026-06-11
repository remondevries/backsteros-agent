import { useEffect, type ReactNode } from "react";

export function SettingsModal({
  children,
  onClose,
  dismissible = true,
}: {
  children: ReactNode;
  onClose?: () => void;
  dismissible?: boolean;
}) {
  useEffect(() => {
    if (!dismissible || !onClose) return;
    const close: () => void = onClose;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dismissible, onClose]);

  return (
    <div className="settings-modal-root" role="presentation">
      <div
        className="settings-modal-overlay"
        aria-hidden
        onClick={dismissible && onClose ? onClose : undefined}
      />
      <div
        className="settings-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        {onClose ? (
          <button
            type="button"
            className="settings-modal-close"
            aria-label="Close settings"
            onClick={onClose}
          >
            ×
          </button>
        ) : null}
        {children}
      </div>
    </div>
  );
}
