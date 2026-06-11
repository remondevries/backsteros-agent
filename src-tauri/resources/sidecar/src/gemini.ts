import { getGeminiApiKey } from "./config.ts";
import type { GeminiContentPart } from "./lookup-attachments.ts";
import {
  buildLookupGenerationConfig,
  normalizeLookupDepthMode,
  resolveLookupModelId,
  type LookupDepthMode,
} from "./lookup-depth.ts";
import {
  appendOutputFormatInstruction,
  normalizeLookupOutputFormat,
  type LookupOutputFormat,
} from "./lookup-output-format.ts";
import type { GeminiHistoryTurn } from "./lookup-sessions.ts";
import { formatGeminiApiError } from "./lookup-gemini-errors.ts";
import { buildLookupTools, extractUrls, type LookupSearchMode } from "./lookup-tools.ts";

export class GeminiLookupError extends Error {
  readonly isRetryable: boolean;

  constructor(message: string, options: { isRetryable?: boolean } = {}) {
    super(message);
    this.name = "GeminiLookupError";
    this.isRetryable = options.isRetryable ?? false;
  }
}

interface GeminiStreamChunk {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    groundingMetadata?: {
      webSearchQueries?: string[];
      groundingChunks?: Array<{
        web?: { uri?: string; title?: string };
      }>;
    };
    urlContextMetadata?: {
      urlMetadata?: Array<{
        retrievedUrl?: string;
        urlRetrievalStatus?: string;
      }>;
    };
  }>;
}

const LOOKUP_SYSTEM_INSTRUCTION = `[Lookup assistant]
You help the user research topics with up-to-date information from the web.
- Prefer concise, accurate answers with clear structure.
- When the user attaches files (PDFs, images, audio, video, text), read them carefully and answer from their contents.
- When the user includes URLs, use URL context to read those pages and cite what you found.
- Cite sources when web search grounding is used.
- Do not claim you changed files, notes, or integrations — you only research and explain.
- If you are unsure, say what you found and what remains uncertain.`;

function requireGeminiApiKey(): string {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new GeminiLookupError("GEMINI_API_KEY is not set", { isRetryable: false });
  }
  return apiKey;
}

function buildContents(history: GeminiHistoryTurn[], promptParts: GeminiContentPart[]) {
  const contents = history.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: message.parts,
  }));
  contents.push({
    role: "user",
    parts: promptParts,
  });
  return contents;
}

function extractDeltaText(chunk: GeminiStreamChunk): string {
  const parts = chunk.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => part.text ?? "")
    .join("");
}

function extractGroundingSources(chunk: GeminiStreamChunk): string[] {
  const metadata = chunk.candidates?.[0]?.groundingMetadata;
  if (!metadata?.groundingChunks?.length) return [];

  const seen = new Set<string>();
  const sources: string[] = [];
  for (const item of metadata.groundingChunks) {
    const uri = item.web?.uri?.trim();
    const title = item.web?.title?.trim();
    if (!uri) continue;
    if (seen.has(uri)) continue;
    seen.add(uri);
    sources.push(title ? `- [${title}](${uri})` : `- ${uri}`);
  }
  return sources;
}

function extractUrlContextSources(chunk: GeminiStreamChunk): string[] {
  const metadata = chunk.candidates?.[0]?.urlContextMetadata;
  if (!metadata?.urlMetadata?.length) return [];

  const lines: string[] = [];
  const seen = new Set<string>();
  for (const item of metadata.urlMetadata) {
    const url = item.retrievedUrl?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const status = item.urlRetrievalStatus?.trim();
    lines.push(status && status !== "URL_RETRIEVAL_STATUS_SUCCESS" ? `- ${url} (${status})` : `- ${url}`);
  }
  return lines;
}

export async function* streamGeminiLookup(
  history: GeminiHistoryTurn[],
  promptParts: GeminiContentPart[],
  options: {
    signal?: AbortSignal;
    depthMode?: LookupDepthMode;
    searchMode?: LookupSearchMode;
    outputFormat?: LookupOutputFormat;
    promptText?: string;
  } = {},
): AsyncGenerator<
  | { type: "search"; queries: string[] }
  | { type: "url-context"; urls: string[] }
  | { type: "text"; text: string }
  | { type: "sources"; lines: string[]; kind: "web" | "url" }
> {
  const apiKey = requireGeminiApiKey();
  const depthMode = normalizeLookupDepthMode(options.depthMode);
  const searchMode = options.searchMode === "docs" ? "docs" : "web";
  const outputFormat = normalizeLookupOutputFormat(options.outputFormat);
  const modelId = resolveLookupModelId(depthMode);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse`;

  const historyText = history
    .flatMap((turn) => turn.parts)
    .map((part) => ("text" in part ? part.text : ""))
    .join("\n");
  const promptText = options.promptText ?? promptParts
    .map((part) => ("text" in part ? part.text : ""))
    .join("\n");
  const tools = buildLookupTools(searchMode, historyText, promptText);
  const systemInstruction = appendOutputFormatInstruction(
    LOOKUP_SYSTEM_INSTRUCTION,
    outputFormat,
  );

  const requestBody: Record<string, unknown> = {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: buildContents(history, promptParts),
    generationConfig: buildLookupGenerationConfig(depthMode),
  };

  if (tools.length > 0) {
    requestBody.tools = tools;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(requestBody),
    signal: options.signal,
  });

  if (!response.ok) {
    const body = await response.text();
    const retryable = response.status === 429 || response.status >= 500;
    throw new GeminiLookupError(formatGeminiApiError(body, response.status), {
      isRetryable: retryable,
    });
  }

  if (!response.body) {
    throw new GeminiLookupError("Gemini returned an empty stream", { isRetryable: true });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let announcedSearch = false;
  let announcedUrls = false;
  const emittedWebSources = new Set<string>();
  const emittedUrlSources = new Set<string>();

  function* parseBufferedEvents(
    events: string[],
  ): Generator<
    | { type: "search"; queries: string[] }
    | { type: "url-context"; urls: string[] }
    | { type: "text"; text: string }
    | { type: "sources"; lines: string[]; kind: "web" | "url" }
  > {
    for (const chunk of events) {
      const dataLine = chunk.split("\n").find((line) => line.startsWith("data:"));
      if (!dataLine) continue;
      const json = dataLine.slice(5).trim();
      if (!json || json === "[DONE]") continue;

      let parsed: GeminiStreamChunk;
      try {
        parsed = JSON.parse(json) as GeminiStreamChunk;
      } catch {
        continue;
      }

      const queries = parsed.candidates?.[0]?.groundingMetadata?.webSearchQueries ?? [];
      if (!announcedSearch && queries.length > 0) {
        announcedSearch = true;
        yield { type: "search", queries };
      }

      const detectedUrls = extractUrls(promptText);
      if (!announcedUrls && detectedUrls.length > 0 && tools.some((tool) => "url_context" in tool)) {
        announcedUrls = true;
        yield { type: "url-context", urls: detectedUrls };
      }

      const delta = extractDeltaText(parsed);
      if (delta) {
        yield { type: "text", text: delta };
      }

      const webSources = extractGroundingSources(parsed);
      const freshWebSources = webSources.filter((line) => !emittedWebSources.has(line));
      if (freshWebSources.length > 0) {
        for (const line of freshWebSources) {
          emittedWebSources.add(line);
        }
        yield { type: "sources", lines: freshWebSources, kind: "web" };
      }

      const urlSources = extractUrlContextSources(parsed);
      const freshUrlSources = urlSources.filter((line) => !emittedUrlSources.has(line));
      if (freshUrlSources.length > 0) {
        for (const line of freshUrlSources) {
          emittedUrlSources.add(line);
        }
        yield { type: "sources", lines: freshUrlSources, kind: "url" };
      }
    }
  }

  function* drainBuffer(): Generator<
    | { type: "search"; queries: string[] }
    | { type: "url-context"; urls: string[] }
    | { type: "text"; text: string }
    | { type: "sources"; lines: string[]; kind: "web" | "url" }
  > {
    const normalized = buffer.replace(/\r\n/g, "\n").trim();
    if (!normalized) return;
    yield* parseBufferedEvents(normalized.split("\n\n"));
    buffer = "";
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (value) {
        buffer += decoder.decode(value, { stream: !done });
      }
      if (done) {
        yield* drainBuffer();
        break;
      }

      const normalized = buffer.replace(/\r\n/g, "\n");
      const chunks = normalized.split("\n\n");
      buffer = chunks.pop() ?? "";

      yield* parseBufferedEvents(chunks);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}
