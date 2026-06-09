import type { WhoopSnapshotEntity } from "./types";
import {
  WHOOP_SLEEP_STAGE_COLORS,
  WHOOP_SLEEP_STAGE_LABELS,
  buildStageSummaryRows,
  buildStageTotalsBar,
  formatWhoopClockTime,
  hasWhoopSleepDetails,
} from "./whoopSleep";

function WhoopSleepHypnogram({
  segments,
  startedAt,
  endedAt,
}: {
  segments: NonNullable<WhoopSnapshotEntity["sleepHypnogram"]>;
  startedAt: string;
  endedAt: string;
}) {
  const startMs = new Date(startedAt).getTime();
  const endMs = new Date(endedAt).getTime();
  const totalMs = endMs - startMs;
  if (totalMs <= 0) return null;

  return (
    <div className="whoop-sleep-timeline">
      <div className="whoop-sleep-timeline-labels">
        <span>{formatWhoopClockTime(startedAt)}</span>
        <span>{formatWhoopClockTime(endedAt)}</span>
      </div>
      <div
        className="whoop-sleep-hypnogram"
        role="img"
        aria-label="Sleep stage timeline"
      >
        {segments.map((segment, index) => {
          const segmentStart = new Date(segment.startedAt).getTime();
          const segmentEnd = new Date(segment.endedAt).getTime();
          const widthPct = Math.max(0, ((segmentEnd - segmentStart) / totalMs) * 100);
          if (widthPct <= 0) return null;

          return (
            <div
              key={`${segment.startedAt}-${index}`}
              className="whoop-sleep-hypnogram-segment"
              style={{
                width: `${widthPct}%`,
                backgroundColor: WHOOP_SLEEP_STAGE_COLORS[segment.stage],
              }}
              title={`${WHOOP_SLEEP_STAGE_LABELS[segment.stage]} · ${formatWhoopClockTime(segment.startedAt)} – ${formatWhoopClockTime(segment.endedAt)}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function WhoopSleepStageLegend({ item }: { item: WhoopSnapshotEntity }) {
  const rows = buildStageSummaryRows(item.sleepStages);
  const bar = buildStageTotalsBar(item.sleepStages);
  if (rows.length === 0) return null;

  return (
    <div className="whoop-sleep-stages">
      {bar.length > 0 && (
        <div className="whoop-sleep-stage-bar" aria-hidden="true">
          {bar.map((row) => (
            <div
              key={row.stage}
              className="whoop-sleep-stage-bar-segment"
              style={{
                width: `${row.widthPct}%`,
                backgroundColor: WHOOP_SLEEP_STAGE_COLORS[row.stage],
              }}
            />
          ))}
        </div>
      )}
      <div className="whoop-sleep-stage-legend">
        {rows.map((row) => (
          <div key={row.stage} className="whoop-sleep-stage-legend-item">
            <span
              className="whoop-sleep-stage-swatch"
              style={{ backgroundColor: WHOOP_SLEEP_STAGE_COLORS[row.stage] }}
            />
            <span className="whoop-sleep-stage-name">{row.label}</span>
            <span className="whoop-sleep-stage-value">
              {row.duration ?? "—"}
              {row.pct != null ? ` · ${row.pct}%` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WhoopSleepStatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="whoop-sleep-stat-tile">
      <span className="whoop-sleep-stat-label">{label}</span>
      <span className="whoop-sleep-stat-value">{value}</span>
    </div>
  );
}

function buildSleepStatTiles(item: WhoopSnapshotEntity): Array<{ label: string; value: string }> {
  const tiles: Array<{ label: string; value: string }> = [];

  if (item.sleepDuration) tiles.push({ label: "Asleep", value: item.sleepDuration });
  if (item.timeInBed) tiles.push({ label: "In bed", value: item.timeInBed });
  if (item.sleepEfficiencyPct != null) {
    tiles.push({ label: "Efficiency", value: `${Math.round(item.sleepEfficiencyPct)}%` });
  }
  if (item.sleepConsistencyPct != null) {
    tiles.push({ label: "Consistency", value: `${Math.round(item.sleepConsistencyPct)}%` });
  }
  if (item.disturbances != null) {
    tiles.push({
      label: "Disturbances",
      value: String(item.disturbances),
    });
  }
  if (item.sleepHrAvgBpm != null) {
    tiles.push({ label: "Avg heart rate", value: `${Math.round(item.sleepHrAvgBpm)} bpm` });
  }
  if (item.sleepHrMinBpm != null) {
    tiles.push({ label: "Min heart rate", value: `${Math.round(item.sleepHrMinBpm)} bpm` });
  }

  return tiles;
}

export function WhoopSleepDetails({ item }: { item: WhoopSnapshotEntity }) {
  if (!hasWhoopSleepDetails(item)) return null;

  const asleepStart = formatWhoopClockTime(item.sleepStartedAt);
  const asleepEnd = formatWhoopClockTime(item.sleepEndedAt);
  const statTiles = buildSleepStatTiles(item);

  return (
    <div className="whoop-sleep-details">
      {(asleepStart || asleepEnd) && (
        <div className="whoop-sleep-window-grid">
          {asleepStart && (
            <WhoopSleepStatTile label="Fell asleep" value={asleepStart} />
          )}
          {asleepEnd && <WhoopSleepStatTile label="Woke up" value={asleepEnd} />}
        </div>
      )}

      {item.sleepHypnogram &&
        item.sleepHypnogram.length > 0 &&
        item.sleepStartedAt &&
        item.sleepEndedAt && (
          <WhoopSleepHypnogram
            segments={item.sleepHypnogram}
            startedAt={item.sleepStartedAt}
            endedAt={item.sleepEndedAt}
          />
        )}

      <WhoopSleepStageLegend item={item} />

      {statTiles.length > 0 && (
        <div className="whoop-sleep-stats-grid">
          {statTiles.map((tile) => (
            <WhoopSleepStatTile key={tile.label} label={tile.label} value={tile.value} />
          ))}
        </div>
      )}
    </div>
  );
}
