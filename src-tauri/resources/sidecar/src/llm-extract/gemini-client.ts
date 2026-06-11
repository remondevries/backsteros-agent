import { getGeminiApiKey } from "../config.ts";
import { buildLookupGenerationConfig, resolveLookupModelId } from "../lookup-depth.ts";
import { formatGeminiApiError } from "../lookup-gemini-errors.ts";
import { parseJsonObject } from "./parse-json.ts";
import { LlmExtractError } from "./types.ts";

const EXTRACT_TIMEOUT_MS = 12_000;

export async function callGeminiJsonExtract(
  systemInstruction: string,
  userPrompt: string,
  options: { signal?: AbortSignal } = {},
): Promise<unknown> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new LlmExtractError("gemini", "GEMINI_API_KEY is not set", { isRetryable: false });
  }

  const modelId = resolveLookupModelId("fast");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EXTRACT_TIMEOUT_MS);
  const signal = options.signal;
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          ...buildLookupGenerationConfig("fast"),
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new LlmExtractError(
        "gemini",
        formatGeminiApiError(response.status, body),
        { isRetryable: response.status === 429 || response.status >= 500 },
      );
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const text = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!text) {
      throw new LlmExtractError("gemini", "Gemini returned an empty extraction response");
    }

    return parseJsonObject(text);
  } catch (error) {
    if (error instanceof LlmExtractError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new LlmExtractError("gemini", "Extraction request timed out", { isRetryable: true });
    }
    const message = error instanceof Error ? error.message : "Extraction failed";
    throw new LlmExtractError("gemini", message, { isRetryable: true });
  } finally {
    clearTimeout(timeout);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}
