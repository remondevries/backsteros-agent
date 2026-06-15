/** Target number of workout rep sub-issues (logged sets) for a daily gym session. */
export const DAILY_GYM_SUB_ISSUE_TARGET = 10;

export const DAILY_GYM_RING_MAX = DAILY_GYM_SUB_ISSUE_TARGET;

/** Matches Whoop productivity orange — distinct from recovery green. */
export const DAILY_GYM_RING_COLOR = "#F97316";

export const DAILY_GYM_RING_COLOR_LOADING =
  "color-mix(in srgb, var(--text-faint) 45%, transparent)";

export function formatDailyGymRingTitle(count: number): string {
  return `Gym ${count} / ${DAILY_GYM_SUB_ISSUE_TARGET} sets logged`;
}
