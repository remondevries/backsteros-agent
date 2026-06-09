import { WhoopIcon } from "./WhoopIcon";

export function WhoopRecoveryScoreLabel({
  score,
  onClick,
}: {
  score: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="whoop-recovery-inline-label"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      aria-label={`Whoop recovery score ${score} — open Whoop dashboard`}
      title="Open Whoop dashboard"
    >
      <WhoopIcon className="whoop-recovery-inline-label-icon" size={12} variant="solid" />
      <span className="whoop-recovery-inline-label-score">{score}</span>
    </button>
  );
}
