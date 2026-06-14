import { parseUpdateConfirmationToken } from "../chat/updateConfirmation";
import type { ChatFocusContext } from "./chatFocusContext";
import { notifyLinearDocumentListChange } from "./linearDocumentListEvents";
import { shouldRefreshLinearIssueFromAgentReply } from "./linearIssueAgentRefresh";
import { requestLinearIssueDetailRefresh } from "./linearIssueDetailRefreshEvents";
import { notifyVaultContentChanged } from "./vaultContentEvents";

function mentionsVaultUpdate(text: string): boolean {
  const update = parseUpdateConfirmationToken(text);
  if (!update) return false;
  return /\b(vault|note|notes|file|document|daily)\b/i.test(`${update.what} ${update.where}`);
}

function mentionsLinearDocumentUpdate(text: string): boolean {
  const update = parseUpdateConfirmationToken(text);
  if (!update) return false;
  return /\bdocument\b/i.test(update.what) || /\bdocument\b/i.test(update.where);
}

/** Keep list/detail views in sync after agent replies that changed focused content. */
export function applyAgentContentSideEffects(
  text: string,
  focusContext?: ChatFocusContext | null,
): void {
  const trimmed = text.trim();
  if (!trimmed) return;

  const issueFocused = focusContext?.kind === "linear_issue";
  const documentFocused = focusContext?.kind === "linear_document";
  const vaultFocused = focusContext?.kind === "vault_document";

  if (issueFocused && shouldRefreshLinearIssueFromAgentReply(trimmed)) {
    requestLinearIssueDetailRefresh();
  } else if (!issueFocused) {
    const update = parseUpdateConfirmationToken(trimmed);
    if (update && /\blinear\b/i.test(update.where)) {
      requestLinearIssueDetailRefresh();
    }
  }

  if (documentFocused || mentionsLinearDocumentUpdate(trimmed)) {
    notifyLinearDocumentListChange({
      type: "refresh",
      documentId: documentFocused ? focusContext.documentId : undefined,
    });
  }

  if (vaultFocused || mentionsVaultUpdate(trimmed)) {
    notifyVaultContentChanged();
  }
}
