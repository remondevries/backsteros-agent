import { afterEach, describe, expect, test } from "bun:test";
import { GeminiLookupError, streamGeminiLookup } from "./gemini.ts";

describe("streamGeminiLookup", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.GEMINI_API_KEY;
  });

  test("throws when GEMINI_API_KEY is missing", async () => {
    process.env.GEMINI_API_KEY = "";
    await expect(async () => {
      for await (const _chunk of streamGeminiLookup([], [{ text: "hello" }])) {
        // no-op
      }
    }).toThrow(GeminiLookupError);
  });

  test("streams text deltas from Gemini SSE", async () => {
    process.env.GEMINI_API_KEY = "test-key";

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]}}]}\n\n',
          ),
        );
        controller.enqueue(
          encoder.encode(
            'data: {"candidates":[{"content":{"parts":[{"text":" world"}]}}]}\n\n',
          ),
        );
        controller.close();
      },
    });

    globalThis.fetch = (async () =>
      new Response(body, { status: 200 })) as typeof fetch;

    const chunks: string[] = [];
    for await (const chunk of streamGeminiLookup([], [{ text: "hi" }])) {
      if (chunk.type === "text") {
        chunks.push(chunk.text);
      }
    }

    expect(chunks.join("")).toBe("Hello world");
  });

  test("streams a single-chunk Gemini SSE response", async () => {
    process.env.GEMINI_API_KEY = "test-key";

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'data: {"candidates":[{"content":{"parts":[{"text":"Hello."}]}}]}\r\n\r\n',
          ),
        );
        controller.close();
      },
    });

    globalThis.fetch = (async () =>
      new Response(body, { status: 200 })) as typeof fetch;

    const chunks: string[] = [];
    for await (const chunk of streamGeminiLookup([], [{ text: "hi" }])) {
      if (chunk.type === "text") {
        chunks.push(chunk.text);
      }
    }

    expect(chunks.join("")).toBe("Hello.");
  });

  test("sends thinking budget for deep lookup mode", async () => {
    process.env.GEMINI_API_KEY = "test-key";

    let requestBody: Record<string, unknown> | null = null;
    globalThis.fetch = (async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response("", { status: 200, headers: { "Content-Type": "text/event-stream" } });
    }) as typeof fetch;

    const iterator = streamGeminiLookup([], [{ text: "hi" }], { depthMode: "deep" });
    await iterator.next();
    await iterator.return?.();

    expect(requestBody).toMatchObject({
      generationConfig: {
        thinkingConfig: {
          thinkingBudget: -1,
        },
      },
    });
  });

  test("omits web search tool in docs mode", async () => {
    process.env.GEMINI_API_KEY = "test-key";

    let requestBody: Record<string, unknown> | null = null;
    globalThis.fetch = (async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response("", { status: 200, headers: { "Content-Type": "text/event-stream" } });
    }) as typeof fetch;

    const iterator = streamGeminiLookup([], [{ text: "Summarize this PDF" }], {
      searchMode: "docs",
    });
    await iterator.next();
    await iterator.return?.();

    expect(requestBody?.tools).toBeUndefined();
  });

  test("includes url context when prompt contains a link", async () => {
    process.env.GEMINI_API_KEY = "test-key";

    let requestBody: Record<string, unknown> | null = null;
    globalThis.fetch = (async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response("", { status: 200, headers: { "Content-Type": "text/event-stream" } });
    }) as typeof fetch;

    const iterator = streamGeminiLookup([], [{ text: "Read https://example.com/article" }], {
      searchMode: "web",
    });
    await iterator.next();
    await iterator.return?.();

    expect(requestBody?.tools).toEqual([{ google_search: {} }, { url_context: {} }]);
  });
});
