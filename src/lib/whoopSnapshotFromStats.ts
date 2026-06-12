import type { WhoopSnapshotEntity } from "../chat/types";

export type VaultNoteWhoopStats = {
  sleep: number | null;
  recovery: number | null;
  strain: number | null;
};

export function whoopSnapshotFromStats(
  date: string,
  stats: VaultNoteWhoopStats,
): WhoopSnapshotEntity | null {
  if (stats.sleep == null && stats.recovery == null && stats.strain == null) {
    return null;
  }

  return {
    id: `whoop-${date}`,
    date,
    sleepPerformance: stats.sleep,
    recoveryScore: stats.recovery,
    strainScore: stats.strain,
  };
}
