import type { LinearWorkspaceViewId } from "../app/linearProjectViews";

export type LinearProjectViewNavigationRegistration = {
  selectionKind: "team" | "project";
  onSelectView: (view: LinearWorkspaceViewId) => void;
};

let registration: LinearProjectViewNavigationRegistration | null = null;

export function registerLinearProjectViewNavigation(
  next: LinearProjectViewNavigationRegistration,
): () => void {
  registration = next;
  return () => {
    if (registration === next) {
      registration = null;
    }
  };
}

export function getLinearProjectViewNavigationRegistration(): LinearProjectViewNavigationRegistration | null {
  return registration;
}
