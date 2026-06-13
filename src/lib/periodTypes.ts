/** Period and date-range types shared by workouts analytics. */

export type PeriodKind =
  | 'full-year'
  | 'this-month'
  | 'last-month'
  | 'ytd'
  | 'q1'
  | 'q2'
  | 'q3'
  | 'q4'
  | 'custom';

export interface Period {
  kind: PeriodKind;
  /** ISO YYYY-MM-DD inclusive (only used for `custom`). */
  customStart?: string;
  /** ISO YYYY-MM-DD inclusive (only used for `custom`). */
  customEnd?: string;
}

/** Resolved date window (inclusive). */
export interface DateRange {
  start: string;
  end: string;
}
