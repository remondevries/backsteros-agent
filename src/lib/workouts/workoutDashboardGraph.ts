export const WORKOUT_DASHBOARD_GRAPH_EXPANDED_HEIGHT_PX = 512;
export const WORKOUT_DASHBOARD_GRAPH_COLLAPSED_HEIGHT_PX = 200;
export const WORKOUT_DASHBOARD_GRAPH_SCROLL_THRESHOLD_PX = 20;

export function workoutDashboardGraphCollapsed(scrollTop: number): boolean {
  return scrollTop > WORKOUT_DASHBOARD_GRAPH_SCROLL_THRESHOLD_PX;
}

/** Avoid re-expanding when collapse shrinks content and the browser resets scrollTop to 0. */
export function nextWorkoutDashboardGraphCollapsed(
  scrollTop: number,
  currentlyCollapsed: boolean,
  ignoreExpandOnce: boolean,
): { collapsed: boolean; ignoreExpandOnce: boolean } {
  if (scrollTop > WORKOUT_DASHBOARD_GRAPH_SCROLL_THRESHOLD_PX) {
    return { collapsed: true, ignoreExpandOnce: true };
  }

  if (
    currentlyCollapsed &&
    ignoreExpandOnce &&
    scrollTop <= WORKOUT_DASHBOARD_GRAPH_SCROLL_THRESHOLD_PX
  ) {
    return { collapsed: true, ignoreExpandOnce: false };
  }

  return { collapsed: false, ignoreExpandOnce: false };
}
