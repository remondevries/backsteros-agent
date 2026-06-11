import { useCallback, useEffect, useState } from "react";
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
  const [animationDone, setAnimationDone] = useState(!animate);

  const handleTypingComplete = useCallback(() => {
    setSettled(true);
  }, []);

  useEffect(() => {
    if (!settled || animationDone) return;

    if (!animate) {
      setAnimationDone(true);
      onTypingComplete?.();
      return;
    }

    const timer = window.setTimeout(() => {
      setAnimationDone(true);
      onTypingComplete?.();
    }, UPDATE_CONFIRMATION_SETTLE_MS);

    return () => window.clearTimeout(timer);
  }, [animate, animationDone, onTypingComplete, settled]);

  return (
    <div
      className={[
        "update-confirmation",
        settled ? "update-confirmation--settled" : "",
        animationDone ? "update-confirmation--animation-done" : "",
      ]
        .filter(Boolean)
        .join(" ")}
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
