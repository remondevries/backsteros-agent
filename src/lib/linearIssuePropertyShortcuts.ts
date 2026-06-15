export type LinearIssuePropertyShortcutKey = "s" | "p" | "a" | "e" | "l" | "o";

export type LinearIssuePropertyShortcutActions = {
  openStatus?: () => boolean;
  openPriority?: () => boolean;
  openAssignee?: () => boolean;
  openEstimate?: () => boolean;
  openLabels?: () => boolean;
  openOrganization?: () => boolean;
  openProject?: () => boolean;
};

let registration: LinearIssuePropertyShortcutActions | null = null;

export function registerLinearIssuePropertyShortcuts(
  next: LinearIssuePropertyShortcutActions,
): () => void {
  registration = next;
  return () => {
    if (registration === next) {
      registration = null;
    }
  };
}

export function triggerLinearIssuePropertyShortcut(
  key: LinearIssuePropertyShortcutKey,
  options?: { shiftKey?: boolean },
): boolean {
  if (!registration) return false;

  if (options?.shiftKey && key === "p") {
    if (!registration.openProject) return false;
    return registration.openProject();
  }

  const action =
    key === "s"
      ? registration.openStatus
      : key === "p"
        ? registration.openPriority
        : key === "a"
          ? registration.openAssignee
          : key === "e"
            ? registration.openEstimate
            : key === "l"
              ? registration.openLabels
              : registration.openOrganization;

  if (!action) return false;
  return action();
}

/** @internal Test helper */
export function resetLinearIssuePropertyShortcutsForTests(): void {
  registration = null;
}
