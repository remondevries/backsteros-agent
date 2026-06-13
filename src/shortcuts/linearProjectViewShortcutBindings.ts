import {
  LINEAR_PROJECT_VIEWS,
  LINEAR_TEAM_VIEWS,
  type LinearWorkspaceViewId,
} from "../app/linearProjectViews";

export const LINEAR_PROJECT_VIEW_SHORTCUT_DIGITS = ["1", "2", "3", "4", "5", "6"] as const;

export type LinearProjectViewShortcutDigit = (typeof LINEAR_PROJECT_VIEW_SHORTCUT_DIGITS)[number];

export function getLinearWorkspaceViewForShortcutDigit(
  kind: "team" | "project",
  digit: string,
): LinearWorkspaceViewId | null {
  const index = LINEAR_PROJECT_VIEW_SHORTCUT_DIGITS.indexOf(digit as LinearProjectViewShortcutDigit);
  if (index < 0) return null;

  const views = kind === "team" ? LINEAR_TEAM_VIEWS : LINEAR_PROJECT_VIEWS;
  return views[index]?.id ?? null;
}

export function linearProjectViewShortcutHint(index: number): string | undefined {
  return LINEAR_PROJECT_VIEW_SHORTCUT_DIGITS[index];
}
