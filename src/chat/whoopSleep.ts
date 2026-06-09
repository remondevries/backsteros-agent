import type { WhoopSleepStage, WhoopSleepStagesSummary, WhoopSnapshotEntity } from "./types";

export const WHOOP_SLEEP_STAGE_COLORS: Record<WhoopSleepStage, string> = {
  AWAKE: "#F4A261",
  LIGHT: "#7EB6FF",
  REM: "#9D5AEF",
  SWS: "#2E4A7D",
};

export const WHOOP_SLEEP_STAGE_LABELS: Record<WhoopSleepStage, string> = {
  AWAKE: "Awake",
  LIGHT: "Light",
  REM: "REM",
  SWS: "Deep",
};

export function formatWhoopClockTime(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatStageDuration(ms: number | null | undefined): string | undefined {
  if (ms == null || ms <= 0) return undefined;
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  if (minutes <= 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function hasWhoopSleepDetails(item: WhoopSnapshotEntity): boolean {
  return Boolean(
    item.sleepStartedAt ||
      item.sleepEndedAt ||
      item.sleepHypnogram?.length ||
      item.sleepStages ||
      item.sleepEfficiencyPct != null ||
      item.disturbances != null,
  );
}

export function buildStageSummaryRows(stages: WhoopSleepStagesSummary | undefined) {
  if (!stages) return [];

  const defs: Array<{
    stage: WhoopSleepStage;
    ms: number | null | undefined;
    pct: number | null | undefined;
  }> = [
    { stage: "SWS", ms: stages.swsMs, pct: stages.swsPct },
    { stage: "REM", ms: stages.remMs, pct: stages.remPct },
    { stage: "LIGHT", ms: stages.lightMs, pct: stages.lightPct },
    { stage: "AWAKE", ms: stages.wakeMs, pct: stages.wakePct },
  ];

  return defs
    .filter(({ ms, pct }) => ms != null || pct != null)
    .map(({ stage, ms, pct }) => ({
      stage,
      label: WHOOP_SLEEP_STAGE_LABELS[stage],
      duration: formatStageDuration(ms),
      pct: pct != null ? Math.round(pct) : undefined,
      ms: ms ?? 0,
    }));
}

export function buildStageTotalsBar(stages: WhoopSleepStagesSummary | undefined) {
  const rows = buildStageSummaryRows(stages);
  const totalMs = rows.reduce((sum, row) => sum + row.ms, 0);
  if (totalMs <= 0) return [];

  return rows.map((row) => ({
    ...row,
    widthPct: (row.ms / totalMs) * 100,
  }));
}
