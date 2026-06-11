import { createRunLifecycleEvents, createRunState } from "./events.ts";
import { GeminiLookupError, streamGeminiLookup } from "./gemini.ts";
import { buildGeminiUserParts } from "./lookup-attachments.ts";
import type { LookupDepthMode } from "./lookup-depth.ts";
import type { LookupOutputFormat } from "./lookup-output-format.ts";
import { loadLookupHistory } from "./lookup-sessions.ts";
import type { LookupSearchMode } from "./lookup-tools.ts";
import type { AttachmentInput } from "./types.ts";
import type { AgentEvent } from "./types.ts";

export interface LookupRunContext {
  runId: string;
  sessionId: string;
  prompt: string;
  attachments?: AttachmentInput[];
  depthMode?: LookupDepthMode;
  searchMode?: LookupSearchMode;
  outputFormat?: LookupOutputFormat;
  signal?: AbortSignal;
  broadcast: (event: AgentEvent) => void;
  isCancelled: () => boolean;
  complete: (status: "finished" | "error" | "cancelled") => void;
}

export async function runLookupMessage(ctx: LookupRunContext): Promise<void> {
  const state = createRunState(ctx.runId);

  ctx.broadcast({
    type: "run.started",
    runId: ctx.runId,
    timestamp: Date.now(),
  });
  ctx.broadcast({
    type: "activity.started",
    runId: ctx.runId,
    timestamp: Date.now(),
  });

  const searchStepId = `lookup-search-${ctx.runId}`;
  const urlStepId = `lookup-url-${ctx.runId}`;
  let searchStarted = false;
  let urlContextStarted = false;
  let webSourcesAppended = false;
  let urlSourcesAppended = false;

  try {
    const history = loadLookupHistory(ctx.sessionId);
    const { parts: promptParts } = await buildGeminiUserParts(
      ctx.prompt,
      ctx.attachments ?? [],
    );

    for await (const chunk of streamGeminiLookup(history, promptParts, {
      signal: ctx.signal,
      depthMode: ctx.depthMode,
      searchMode: ctx.searchMode,
      outputFormat: ctx.outputFormat,
      promptText: ctx.prompt,
    })) {
      if (ctx.isCancelled()) {
        ctx.complete("cancelled");
        return;
      }

      if (chunk.type === "search") {
        searchStarted = true;
        const label =
          chunk.queries.length > 0
            ? `Searching the web for “${chunk.queries[0]}”…`
            : "Searching the web…";
        ctx.broadcast({
          type: "activity.step",
          runId: ctx.runId,
          stepId: searchStepId,
          kind: "generic",
          label,
          status: "running",
          toolName: "google_search",
        });
        continue;
      }

      if (chunk.type === "url-context") {
        urlContextStarted = true;
        const label =
          chunk.urls.length > 0
            ? `Reading ${chunk.urls.length} linked page${chunk.urls.length === 1 ? "" : "s"}…`
            : "Reading linked pages…";
        ctx.broadcast({
          type: "activity.step",
          runId: ctx.runId,
          stepId: urlStepId,
          kind: "generic",
          label,
          status: "running",
          toolName: "url_context",
        });
        continue;
      }

      if (chunk.type === "text") {
        state.lastAssistantText += chunk.text;
        ctx.broadcast({
          type: "message.delta",
          runId: ctx.runId,
          text: chunk.text,
        });
        continue;
      }

      if (chunk.type === "sources" && chunk.lines.length > 0) {
        const heading = chunk.kind === "url" ? "**Linked pages**" : "**Sources**";
        const alreadyAppended = chunk.kind === "url" ? urlSourcesAppended : webSourcesAppended;
        const block = `\n\n${heading}\n${chunk.lines.join("\n")}`;
        if (!alreadyAppended) {
          if (chunk.kind === "url") {
            urlSourcesAppended = true;
          } else {
            webSourcesAppended = true;
          }
          state.lastAssistantText += block;
          ctx.broadcast({
            type: "message.delta",
            runId: ctx.runId,
            text: block,
          });
        }
      }
    }

    if (ctx.isCancelled()) {
      ctx.complete("cancelled");
      return;
    }

    if (searchStarted) {
      ctx.broadcast({
        type: "activity.step",
        runId: ctx.runId,
        stepId: searchStepId,
        kind: "generic",
        label: "Web search completed",
        status: "completed",
        toolName: "google_search",
      });
    }

    if (urlContextStarted) {
      ctx.broadcast({
        type: "activity.step",
        runId: ctx.runId,
        stepId: urlStepId,
        kind: "generic",
        label: "Linked pages read",
        status: "completed",
        toolName: "url_context",
      });
    }

    ctx.complete("finished");
  } catch (error) {
    if (ctx.isCancelled()) {
      ctx.complete("cancelled");
      return;
    }

    const message = error instanceof Error ? error.message : "Lookup failed";
    if (error instanceof GeminiLookupError) {
      ctx.broadcast({
        type: "startup.failed",
        message,
        retryable: error.isRetryable,
      });
    } else {
      ctx.broadcast({
        type: "run.failed",
        runId: ctx.runId,
        message,
      });
    }
    ctx.complete("error");
  }
}

export function completeLookupRun(
  runId: string,
  state: ReturnType<typeof createRunState>,
  status: "finished" | "error" | "cancelled",
  broadcast: (event: AgentEvent) => void,
): void {
  for (const event of createRunLifecycleEvents(runId, state, status)) {
    broadcast(event);
  }
}
