import type { ReactNode } from "react";

export type InlineDetailPillScoreVariant = "default" | "sleep" | "recovery" | "strain";

export function InlineDetailPill({
  icon,
  value,
  scoreVariant = "default",
  className,
  onClick,
  ariaLabel,
  title,
}: {
  icon: ReactNode;
  value: ReactNode;
  scoreVariant?: InlineDetailPillScoreVariant;
  className?: string;
  onClick: () => void;
  ariaLabel: string;
  title: string;
}) {
  return (
    <button
      type="button"
      className={[
        "inline-detail-pill",
        scoreVariant !== "default" ? `inline-detail-pill--${scoreVariant}` : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      aria-label={ariaLabel}
      title={title}
    >
      <span className="inline-detail-pill-icon">{icon}</span>
      <span className="inline-detail-pill-value">{value}</span>
    </button>
  );
}
