export function formatGeminiApiError(body: string, status: number): string {
  let message: string | undefined;
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    message = parsed.error?.message?.trim();
  } catch {
    message = body.trim() || undefined;
  }

  if (status === 429) {
    return [
      "Gemini API quota limit reached for your API key.",
      "Free tier limits are easy to hit with PDF uploads and web search.",
      "Try Docs mode for file-only Q&A, wait a few minutes, or check usage at https://ai.dev/rate-limit",
      message ? `Details: ${message}` : undefined,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return message || `Gemini request failed (${status})`;
}
