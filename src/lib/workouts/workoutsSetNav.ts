import type { WorkoutSet } from './types';

const SET_NAV_SEP = '\u001f';

/** Stable nav key for a CSV set row (date + exercise + set number). */
export function workoutsSetNavKey(set: Pick<WorkoutSet, 'date' | 'exercise' | 'setNumber'>): string {
  return [set.date, set.exercise, String(set.setNumber)].join(SET_NAV_SEP);
}
