/** Max characters per injected context section before truncation. */
export const MAX_CONTEXT_SECTION_CHARS = 10_000;

export function truncateContextSection(
  text: string,
  maxChars = MAX_CONTEXT_SECTION_CHARS,
): string {
  if (text.length <= maxChars) {
    return text;
  }

  const omitted = text.length - maxChars;
  return `${text.slice(0, maxChars)}\n… (truncated, ${omitted} chars omitted)`;
}
