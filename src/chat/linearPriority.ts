export const LINEAR_PRIORITY_LABELS = [
  "No priority",
  "Urgent",
  "High",
  "Medium",
  "Low",
] as const;

export function getPriorityLabel(priority?: number): string {
  if (priority === undefined || priority < 0 || priority > 4) {
    return LINEAR_PRIORITY_LABELS[0];
  }
  return LINEAR_PRIORITY_LABELS[priority] ?? LINEAR_PRIORITY_LABELS[0];
}

/** Number of filled bars in Linear's 3-bar priority icon (0–3). */
export function getPriorityActiveBars(priority?: number): number {
  if (priority === undefined || priority === 0) return 0;
  if (priority === 4) return 1;
  if (priority === 3) return 2;
  return 3;
}

export function isPriorityUrgent(priority?: number): boolean {
  return priority === 1;
}

export function isPriorityNone(priority?: number): boolean {
  return priority === undefined || priority === 0;
}
