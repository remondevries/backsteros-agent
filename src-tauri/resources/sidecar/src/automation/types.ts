import type { ToolCategory } from "../types.ts";

export type ActivityStepLogger = (
  stepId: string,
  kind: ToolCategory,
  label: string,
  status: "completed" | "error" | "running",
  toolName?: string,
) => void;

export type AutomationHandlerContext = {
  runId: string;
  text: string;
  notesPath: string;
  timezone: string;
  selectedModel?: string;
  captureTime?: string;
  logStep: ActivityStepLogger;
  broadcastAssistantMessage: (text: string) => void;
  setLastAssistantText: (text: string) => void;
  completeFinished: () => void;
  completeFailed: (message: string) => void;
  broadcast: (event: Record<string, unknown>) => void;
  scheduleLinearAvatarBackfill: (
    runId: string,
    event: {
      type: "entities.created";
      runId: string;
      entityType: "linear_issue";
      items: unknown[];
    },
  ) => void;
};

export type AutomationHandler = {
  id: string;
  matches: (quickActionId: string) => boolean;
  run: (ctx: AutomationHandlerContext) => Promise<void>;
};

export type AutomationResult = {
  text: string;
  entities?: unknown[];
  durationMs?: number;
};
