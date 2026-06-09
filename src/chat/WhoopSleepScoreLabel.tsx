import { WhoopIcon } from "./WhoopIcon";

export function WhoopSleepScoreLabel({
  score,
  onClick,
}: {
  score: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="whoop-sleep-inline-label"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      aria-label={`Whoop sleep score ${score} — open Whoop dashboard`}
      title="Open Whoop dashboard"
    >
      <WhoopIcon className="whoop-sleep-inline-label-icon" size={12} variant="solid" />
      <span className="whoop-sleep-inline-label-score">{score}</span>
    </button>
  );
}
