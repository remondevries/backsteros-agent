export type LinearIssuePropertyShortcutKey = "s" | "p" | "a" | "e" | "l";

export type LinearIssuePropertyShortcutActions = {
  openStatus?: () => boolean;
  openPriority?: () => boolean;
  openAssignee?: () => boolean;
  openEstimate?: () => boolean;
  openLabels?: () => boolean;
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

export function triggerLinearIssuePropertyShortcut(key: LinearIssuePropertyShortcutKey): boolean {
  if (!registration) return false;

  const action =
    key === "s"
      ? registration.openStatus
      : key === "p"
        ? registration.openPriority
        : key === "a"
          ? registration.openAssignee
          : key === "e"
            ? registration.openEstimate
            : registration.openLabels;

  if (!action) return false;
  return action();
}

/** @internal Test helper */
export function resetLinearIssuePropertyShortcutsForTests(): void {
  registration = null;
}
