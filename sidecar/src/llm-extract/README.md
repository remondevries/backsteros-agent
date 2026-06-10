# LLM extract

Reusable structured extraction via Gemini (fast model, JSON output). Handlers and features call `runLlmExtract(taskId, message)` instead of embedding one-off prompts.

## Add a new task

1. Create `tasks/<task-id>.ts` with:
   - Output types
   - `systemInstruction` — what to extract and JSON rules
   - `buildUserPrompt(message, context?)` — user message + schema hint
   - `parseOutput(raw)` — validate/normalize parsed JSON
   - `heuristicExtract(message, context?)` — optional fallback for tests and LLM failures
2. Register the task in `registry.ts`.
3. Call `runLlmExtract("<task-id>", message)` from an automation handler, API route, or other sidecar code.

## API

- `GET /llm-extract/tasks` — list task ids and descriptions
- `POST /llm-extract` — body `{ taskId, message, context? }` → `{ taskId, data }`

## Execution mode

When `BACKSTER_EXECUTION_MODE=test`, Gemini is skipped and `heuristicExtract` is used when defined.

## Current tasks

| Task id | Purpose |
|---------|---------|
| `grocery-items` | Split a natural-language message into grocery items (`name`, optional `quantity`, `note`). Used by the grocery list automation to append checkbox lines to the weekly Linear issue. |
