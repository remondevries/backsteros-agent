import { useEffect, useMemo, useState } from "react";
import { getVisibleQuickActions, type QuickAction } from "./quickActions";

export function QuickActionsBar({
  composerText = "",
  disabled,
  morningReviewUsageVersion = 0,
  onAction,
}: {
  composerText?: string;
  disabled?: boolean;
  morningReviewUsageVersion?: number;
  onAction: (action: QuickAction) => void;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const actions = useMemo(
    () => getVisibleQuickActions(now, { composerText }),
    [now, morningReviewUsageVersion, composerText],
  );

  return (
    <div className="quick-actions-bar" aria-label="Quick actions">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className="quick-action-chip"
          disabled={disabled}
          onClick={() => onAction(action)}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
