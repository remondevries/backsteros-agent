export const LETTER_ACTION_ID = "letter";

export const LETTER_CONFIRM_ACTION_ID = "letter-confirm";

export const LETTER_MESSAGE = "File this letter";

export const LETTER_LABEL = "Letter";

export const LETTER_CONFIRM_PLACEHOLDER =
  "Confirm or correct: from, organization, received date, status…";

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
  return composerQuickActionId === LETTER_ACTION_ID;
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
