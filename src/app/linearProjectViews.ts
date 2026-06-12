export const LINEAR_TEAM_VIEWS = [
  { id: "overview", label: "Overview" },
  { id: "projects", label: "Projects" },
  { id: "documents", label: "Documents" },
  { id: "meetings", label: "Meetings" },
  { id: "letters", label: "Letters" },
  { id: "activities", label: "Activities" },
] as const;

export const LINEAR_PROJECT_VIEWS = [
  { id: "overview", label: "Overview" },
  { id: "issues", label: "Issues" },
  { id: "watchers", label: "Watchers" },
  { id: "documents", label: "Documents" },
  { id: "meetings", label: "Meetings" },
  { id: "letters", label: "Letters" },
  { id: "activities", label: "Activities" },
] as const;

export type LinearTeamViewId = (typeof LINEAR_TEAM_VIEWS)[number]["id"];
export type LinearProjectViewId = (typeof LINEAR_PROJECT_VIEWS)[number]["id"];
export type LinearWorkspaceViewId = LinearTeamViewId | LinearProjectViewId;

export function linearWorkspaceViewsForKind(kind: "team" | "project") {
  return kind === "team" ? LINEAR_TEAM_VIEWS : LINEAR_PROJECT_VIEWS;
}

export function defaultLinearWorkspaceViewId(_kind: "team" | "project"): LinearWorkspaceViewId {
  return "overview";
}

export function isLinearTeamViewId(value: string): value is LinearTeamViewId {
  return LINEAR_TEAM_VIEWS.some((view) => view.id === value);
}

export function isLinearProjectViewId(value: string): value is LinearProjectViewId {
  return LINEAR_PROJECT_VIEWS.some((view) => view.id === value);
}

export function isLinearWorkspaceViewIdForKind(
  kind: "team" | "project",
  value: string,
): value is LinearWorkspaceViewId {
  return linearWorkspaceViewsForKind(kind).some((view) => view.id === value);
}

export function linearWorkspaceViewLabel(
  kind: "team" | "project",
  id: LinearWorkspaceViewId,
): string {
  return linearWorkspaceViewsForKind(kind).find((view) => view.id === id)?.label ?? "Overview";
}

export function linearProjectViewLabel(id: LinearProjectViewId): string {
  return linearWorkspaceViewLabel("project", id);
}

export function linearTeamViewLabel(id: LinearTeamViewId): string {
  return linearWorkspaceViewLabel("team", id);
}
