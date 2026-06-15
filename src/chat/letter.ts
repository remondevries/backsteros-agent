export const LETTER_ACTION_ID = "letter";

export const LETTER_CONFIRM_ACTION_ID = "letter-confirm";

export const LETTER_MESSAGE = "File this letter";

export const LETTER_LABEL = "Letter";

export const LETTER_CONFIRM_PLACEHOLDER =
  "Confirm or correct: from, organization, received date, status…";

/** Labels for the linked-issue due date field in letter sidebars (stored as Linear dueDate). */
export const LETTER_RECEIVED_DATE_PROPERTY_LABELS = {
  emptyLabel: "Received",
  changeLabel: "Change received date",
  clearOptionLabel: "Date received",
} as const;

export function isLetterMessage(quickActionId?: string): boolean {
  return quickActionId === LETTER_ACTION_ID;
}

export function isLetterConfirmMessage(quickActionId?: string): boolean {
  return quickActionId === LETTER_CONFIRM_ACTION_ID;
}

export function isLetterFlowMessage(quickActionId?: string): boolean {
  return isLetterMessage(quickActionId) || isLetterConfirmMessage(quickActionId);
}

export function isLetterComposerMode(composerQuickActionId?: string | null): boolean {
  return (
    composerQuickActionId === LETTER_ACTION_ID ||
    composerQuickActionId === LETTER_CONFIRM_ACTION_ID
  );
}

export function isLetterConfirmComposerMode(composerQuickActionId?: string | null): boolean {
  return composerQuickActionId === LETTER_CONFIRM_ACTION_ID;
}

export function parseLetterShortcut(text: string): boolean {
  return /^\/letter\s*$/i.test(text.trim());
}

export function shouldSendComposerAttachments(
  messageText: string | undefined,
  quickActionId?: string,
): boolean {
  if (!messageText) return true;
  return isLetterMessage(quickActionId) || parseLetterShortcut(messageText);
}
