import { WhoopMetricRing } from "../../chat/WhoopMetricRing";
import type { WhoopSnapshotEntity } from "../../chat/types";
import {
  WHOOP_METRIC_COLORS,
  WHOOP_METRIC_MAX,
  formatWhoopRingValue,
} from "../../chat/whoopMetrics";

export function VaultDocumentWhoopHeader({ snapshot }: { snapshot: WhoopSnapshotEntity }) {
  return (
    <div className="vault-document-whoop">
      <div className="whoop-metrics-row">
        <WhoopMetricRing
          label="Sleep"
          value={snapshot.sleepPerformance}
          max={WHOOP_METRIC_MAX.sleep}
          ringColor={WHOOP_METRIC_COLORS.sleep}
          displayValue={formatWhoopRingValue(snapshot.sleepPerformance, WHOOP_METRIC_MAX.sleep)}
          title={
            snapshot.sleepPerformance != null
              ? `Sleep ${formatWhoopRingValue(snapshot.sleepPerformance, WHOOP_METRIC_MAX.sleep)}`
              : undefined
          }
        />
        <WhoopMetricRing
          label="Recovery"
          value={snapshot.recoveryScore}
          max={WHOOP_METRIC_MAX.recovery}
          ringColor={WHOOP_METRIC_COLORS.recovery}
          displayValue={formatWhoopRingValue(snapshot.recoveryScore, WHOOP_METRIC_MAX.recovery)}
          title={
            snapshot.recoveryScore != null
              ? `Recovery ${formatWhoopRingValue(snapshot.recoveryScore, WHOOP_METRIC_MAX.recovery)}`
              : undefined
          }
        />
        <WhoopMetricRing
          label="Strain"
          value={snapshot.strainScore}
          targetValue={snapshot.strainTarget?.value}
          max={WHOOP_METRIC_MAX.strain}
          ringColor={WHOOP_METRIC_COLORS.strain}
          displayValue={formatWhoopRingValue(snapshot.strainScore, WHOOP_METRIC_MAX.strain, 1)}
          title={
            snapshot.strainScore != null
              ? `Strain ${formatWhoopRingValue(snapshot.strainScore, WHOOP_METRIC_MAX.strain, 1)}`
              : undefined
          }
        />
      </div>
    </div>
  );
}
