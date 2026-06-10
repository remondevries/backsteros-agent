import { useCallback, useEffect, useRef, useState } from "react";
import { TerminalTypingText } from "./TerminalTypingText";
import { UpdateConfirmationCheckIcon } from "./UpdateConfirmationCheckIcon";
import {
  formatUpdateConfirmationMessage,
  type UpdateConfirmationParts,
} from "./updateConfirmation";

const UPDATE_CONFIRMATION_SETTLE_MS = 560;

export function UpdateConfirmationPresentation({
  what,
  where,
  message,
  running,
  startedAt,
  readingAloud = false,
  animate = true,
  onTypingComplete,
  onOpenLinearDashboard,
  onOpenWhoopDashboard,
}: UpdateConfirmationParts & {
  running: boolean;
  startedAt?: number;
  readingAloud?: boolean;
  animate?: boolean;
  onTypingComplete?: () => void;
  onOpenLinearDashboard?: () => void;
  onOpenWhoopDashboard?: () => void;
}) {
  const messageText = formatUpdateConfirmationMessage({ what, where, message });
  const [settled, setSettled] = useState(!animate);

  const handleTypingComplete = useCallback(() => {
    setSettled(true);
  }, []);

  useEffect(() => {
    if (!settled || !onTypingComplete) return;
    if (!animate) {
      onTypingComplete();
      return;
    }

    const timer = window.setTimeout(() => {
      onTypingComplete();
    }, UPDATE_CONFIRMATION_SETTLE_MS);

    return () => window.clearTimeout(timer);
  }, [animate, onTypingComplete, settled]);

  return (
    <div
      className={`update-confirmation ${settled ? "update-confirmation--settled" : ""}`}
      aria-label={messageText}
    >
      <div className="update-confirmation-icon-slot" aria-hidden={!settled}>
        <div className="update-confirmation-icon-reveal">
          <div className="update-confirmation-icon-track">
            <UpdateConfirmationCheckIcon />
          </div>
          <div className="update-confirmation-icon-gradient" aria-hidden="true" />
        </div>
      </div>
      <div className="update-confirmation-text">
        <TerminalTypingText
          text={messageText}
          running={running}
          startedAt={startedAt}
          readingAloud={readingAloud}
          animate={animate}
          onTypingComplete={handleTypingComplete}
          onOpenLinearDashboard={onOpenLinearDashboard}
          onOpenWhoopDashboard={onOpenWhoopDashboard}
        />
      </div>
    </div>
  );
}
