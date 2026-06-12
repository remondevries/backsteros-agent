import { parseUpdateConfirmationToken } from "../chat/updateConfirmation";

/** True when an agent reply likely changed the open Linear issue. */
export function shouldRefreshLinearIssueFromAgentReply(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const update = parseUpdateConfirmationToken(trimmed);
  if (update) {
    return /\blinear\b/i.test(update.where);
  }

  return true;
}
