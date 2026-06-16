import type { LinearIssueDetailUpdates } from "../api";

const pendingIssueUpdates = new Map<string, LinearIssueDetailUpdates>();

export function mergePendingIssueUpdates(
  issueId: string,
  updates: LinearIssueDetailUpdates,
): LinearIssueDetailUpdates {
  const id = issueId.trim();
  const merged = { ...pendingIssueUpdates.get(id), ...updates };
  pendingIssueUpdates.set(id, merged);
  return merged;
}

export function peekPendingIssueUpdates(issueId: string): LinearIssueDetailUpdates | null {
  const updates = pendingIssueUpdates.get(issueId.trim());
  if (!updates || Object.keys(updates).length === 0) return null;
  return { ...updates };
}

export function clearPendingIssueUpdates(issueId: string): void {
  pendingIssueUpdates.delete(issueId.trim());
}

export function clearPendingIssueUpdatesForMappedId(localId: string, remoteId: string): void {
  const local = localId.trim();
  const remote = remoteId.trim();
  const pending = pendingIssueUpdates.get(local);
  if (pending) {
    pendingIssueUpdates.set(remote, { ...pendingIssueUpdates.get(remote), ...pending });
    pendingIssueUpdates.delete(local);
  }
}
