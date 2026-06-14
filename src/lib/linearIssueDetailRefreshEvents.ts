type LinearIssueDetailRefreshListener = () => void;

const listeners = new Set<LinearIssueDetailRefreshListener>();

export function onLinearIssueDetailRefreshRequested(
  listener: LinearIssueDetailRefreshListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function requestLinearIssueDetailRefresh(): void {
  for (const listener of listeners) {
    listener();
  }
}
