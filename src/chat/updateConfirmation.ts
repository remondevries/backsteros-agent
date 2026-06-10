const UPDATE_CONFIRMATION_TOKEN_RE = /^\{\{update:([^|]+)\|([^|]+)(?:\|([\s\S]+))?\}\}$/;

/** Shared update confirmation copy + wire token for structured agent responses. */

export interface UpdateConfirmationParts {
  what: string;
  where: string;
  message?: string;
}

export function formatUpdateConfirmationMessage({ what, where, message }: UpdateConfirmationParts): string {
  if (message?.trim()) return message.trim();
  return `I've updated for you the ${what} in ${where}.`;
}

export function buildUpdateConfirmationToken(what: string, where: string, message?: string): string {
  if (message?.trim()) {
    return `{{update:${what}|${where}|${message.trim()}}}`;
  }
  return `{{update:${what}|${where}}}`;
}

export function parseUpdateConfirmationToken(text: string): UpdateConfirmationParts | null {
  const match = text.trim().match(UPDATE_CONFIRMATION_TOKEN_RE);
  if (!match) return null;
  return {
    what: match[1].trim(),
    where: match[2].trim(),
    message: match[3]?.trim() || undefined,
  };
}
