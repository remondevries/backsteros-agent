/** Max characters of extracted attachment text sent to Gemini per inclusion. */
export const MAX_LOOKUP_ATTACHMENT_CHARS = 80_000;

/** Max characters of assistant reply text kept in lookup history (after citation stripping). */
export const MAX_LOOKUP_ASSISTANT_HISTORY_CHARS = 12_000;

const CITATION_BLOCK_PATTERN = /\n\n\*\*(Sources|Linked pages)\*\*\n[\s\S]*$/;

export function stripLookupCitationBlocks(text: string): string {
  return text.replace(CITATION_BLOCK_PATTERN, "").trim();
}

export function truncateLookupText(
  text: string,
  maxChars: number,
  label = "content",
): string {
  if (text.length <= maxChars) {
    return text;
  }

  const omitted = text.length - maxChars;
  return `${text.slice(0, maxChars)}\n… (${label} truncated, ${omitted} chars omitted)`;
}

export function prepareLookupAttachmentContent(content: string): string {
  return truncateLookupText(content.trim(), MAX_LOOKUP_ATTACHMENT_CHARS, "attachment");
}

export function prepareLookupAssistantHistoryText(text: string): string {
  const withoutCitations = stripLookupCitationBlocks(text);
  return truncateLookupText(
    withoutCitations,
    MAX_LOOKUP_ASSISTANT_HISTORY_CHARS,
    "prior reply",
  );
}
