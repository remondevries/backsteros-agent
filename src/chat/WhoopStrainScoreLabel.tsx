import { InlineDetailPill } from "./InlineDetailPill";
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
    <InlineDetailPill
      icon={<WhoopIcon size={18} variant="solid" />}
      value={display}
      scoreVariant="strain"
      onClick={onClick}
      ariaLabel={`Whoop strain score ${display} — open Whoop dashboard`}
      title="Open Whoop dashboard"
    />
  );
}
