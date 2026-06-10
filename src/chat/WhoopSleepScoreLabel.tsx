import { InlineDetailPill } from "./InlineDetailPill";
import { WhoopIcon } from "./WhoopIcon";

export function WhoopSleepScoreLabel({
  score,
  onClick,
}: {
  score: number;
  onClick: () => void;
}) {
  return (
    <InlineDetailPill
      icon={<WhoopIcon size={18} variant="solid" />}
      value={score}
      scoreVariant="sleep"
      onClick={onClick}
      ariaLabel={`Whoop sleep score ${score} — open Whoop dashboard`}
      title="Open Whoop dashboard"
    />
  );
}
