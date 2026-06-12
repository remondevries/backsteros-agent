export const LINEAR_PROJECT_VIEWS = [
  { id: "overview", label: "Overview" },
  { id: "issues", label: "Issues" },
  { id: "watchers", label: "Watchers" },
  { id: "documents", label: "Documents" },
  { id: "meetings", label: "Meetings" },
  { id: "letters", label: "Letters" },
  { id: "activities", label: "Activities" },
] as const;

export type LinearProjectViewId = (typeof LINEAR_PROJECT_VIEWS)[number]["id"];

export function isLinearProjectViewId(value: string): value is LinearProjectViewId {
  return LINEAR_PROJECT_VIEWS.some((view) => view.id === value);
}

export function linearProjectViewLabel(id: LinearProjectViewId): string {
  return LINEAR_PROJECT_VIEWS.find((view) => view.id === id)?.label ?? "Overview";
}
