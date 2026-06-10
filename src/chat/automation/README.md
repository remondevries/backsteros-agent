# Client automation flows

Good morning (`/gm`) is the reference automation. New flows should plug into this module instead of wiring pacing, composer mode, follow-ups, and cancellation directly in `ChatView.tsx`.

## Flow shape

1. User triggers the automation (chip or slash shortcut).
2. Sidecar runs the initial structured handler and returns a prepared message.
3. Optional follow-up prompt is revealed via transcript pacing (`BacksterAssistantBlock`).
4. User answer runs a confirmation handler that returns an update-confirmation token for the check animation.

## Add a new automation

1. Define constants in `src/chat/myFlow.ts` (action IDs, messages, composer mode helper).
2. Add an `AutomationDefinition` in [`registry.ts`](registry.ts):
   - `trigger` — shortcut regex, initial message, initial quick action id
   - `steps` — `initialRun`, optional `followUpPrompt`, optional `confirmationRun`
   - `cancellationMessage` — optional override; defaults to `AUTOMATION_FLOW_CANCELLATION_DEFAULT`
3. Implement sidecar handlers in `sidecar/src/automation/` and register them in `sidecar/src/automation/registry.ts`.
4. Add a quick action chip in [`../quickActions.ts`](../quickActions.ts) when needed.
5. Add tests in this folder for registry wiring and orchestration helpers.

## Key modules

| Module | Role |
|--------|------|
| [`types.ts`](types.ts) | Step and definition types |
| [`registry.ts`](registry.ts) | Declarative flow configs |
| [`followUp.ts`](followUp.ts) | Shared follow-up message + dedupe helpers |
| [`orchestration.ts`](orchestration.ts) | Pure send/block/routing helpers |
| [`useAutomationOrchestration.ts`](useAutomationOrchestration.ts) | React hook used by `ChatView` |

## Shared presentation (do not reimplement)

- Initial run: `RunBlock` with `sourceBrand: "backster"`
- Follow-up prompts: `BacksterAssistantBlock`
- Confirmation: `{{update:what\|where}}` token → `UpdateConfirmationPresentation`
- Pacing: `useTranscriptPacing` / `enqueueReveal`
- Cancel: Escape / Ctrl+C via `automationFlow.ts` + registry cancellation copy

## Follow-up migrations

Good night and daily capture use the same registry + sidecar handler pattern. Letter still uses legacy `ChatView` wiring.
