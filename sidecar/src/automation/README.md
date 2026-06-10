# Sidecar automation handlers

Structured automations (Good morning today; Good night and others later) register handlers here instead of inline branches in `server.ts`.

## Handler contract

Each handler implements:

```typescript
type AutomationHandler = {
  id: string;
  matches: (quickActionId: string) => boolean;
  run: (ctx: AutomationHandlerContext) => Promise<void>;
};
```

`AutomationHandlerContext` provides run lifecycle helpers (`logStep`, `broadcastAssistantMessage`, `completeFinished`, `completeFailed`) so handlers stay focused on business logic.

## Results and confirmation

Handlers that write data should finish with assistant text containing an update-confirmation token from `update-confirmation.ts`:

```typescript
buildUpdateConfirmationToken("update", "daily note");
```

The client renders that token with the shared check animation in `RunBlock`.

## Adding a handler

1. Implement `runYourFlowAutomation(ctx)` in `your-flow-handlers.ts`.
2. Export an `AutomationHandler` with a unique `id` and `matches` on your `quickActionId`.
3. Register it in `registry.ts`.
4. Add a matching client definition in `src/chat/automation/registry.ts`.

Good morning initial + feel handlers are the reference implementation.
