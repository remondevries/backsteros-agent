export type LinearIssueViewModeIntent = "issue" | "terminal";

type Listener = (issueId: string, mode: LinearIssueViewModeIntent) => void;

const pendingModes = new Map<string, LinearIssueViewModeIntent>();
const listeners = new Set<Listener>();

export function requestLinearIssueViewMode(issueId: string, mode: LinearIssueViewModeIntent): void {
  const trimmedIssueId = issueId.trim();
  if (!trimmedIssueId) return;
  pendingModes.set(trimmedIssueId, mode);
  for (const listener of listeners) {
    listener(trimmedIssueId, mode);
  }
}

export function consumeLinearIssueViewMode(
  issueId: string,
): LinearIssueViewModeIntent | null {
  const trimmedIssueId = issueId.trim();
  if (!trimmedIssueId) return null;
  const mode = pendingModes.get(trimmedIssueId) ?? null;
  pendingModes.delete(trimmedIssueId);
  return mode;
}

export function subscribeLinearIssueViewModeIntent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
