import { WhoopIcon } from "./WhoopIcon";

export function WhoopStrainScoreLabel({
  score,
  onClick,
}: {
  score: number;
  onClick: () => void;
}) {
  const display = Number.isInteger(score) ? String(score) : score.toFixed(1);

  return (
    <button
      type="button"
      className="whoop-strain-inline-label"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      aria-label={`Whoop strain score ${display} — open Whoop dashboard`}
      title="Open Whoop dashboard"
    >
      <WhoopIcon className="whoop-strain-inline-label-icon" size={12} variant="solid" />
      <span className="whoop-strain-inline-label-score">{display}</span>
    </button>
  );
}
