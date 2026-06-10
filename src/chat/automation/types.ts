import type { ChatMessage } from "../types";

export type AutomationFlowId = "good-morning" | "good-night" | "daily-capture" | "grocery-list" | "letter";

export type AutomationFlowVariant =
  | "good-morning"
  | "good-night"
  | "letter"
  | "daily-capture"
  | "grocery-list";

export type InitialRunStep = {
  kind: "initialRun";
  quickActionId: string;
  sourceBrand?: "backster";
};

export type FollowUpPromptStep = {
  kind: "followUpPrompt";
  id: string;
  prompt: string | ((ctx: { runId: string }) => string);
  composerQuickActionId: string;
  answerQuickActionId: string;
  hasPromptForRun: (
    messages: Array<Pick<ChatMessage, "role" | "flowVariant" | "text" | "flowRunId">>,
    runId: string,
  ) => boolean;
  pacingKey: (runId: string) => string;
};

export type ConfirmationRunStep = {
  kind: "confirmationRun";
  answerQuickActionId: string;
};

export type FollowUpQuestionnaireStep = {
  kind: "followUpQuestionnaire";
  id: string;
  questions: readonly string[];
  composerQuickActionId: string;
  interimAnswerQuickActionId: string;
  submitQuickActionId: string;
  hasQuestionnaireStartedForRun: (
    messages: Array<Pick<ChatMessage, "role" | "flowVariant" | "text" | "flowRunId">>,
    runId: string,
  ) => boolean;
  pacingKey: (runId: string) => string;
  questionPacingKey: (runId: string, questionIndex: number) => string;
  serializeAnswers: (answers: string[]) => string;
};

export type AutomationStep =
  | InitialRunStep
  | FollowUpPromptStep
  | FollowUpQuestionnaireStep
  | ConfirmationRunStep;

export type AutomationDefinition = {
  id: AutomationFlowId;
  flowVariant: AutomationFlowVariant;
  label: string;
  trigger: {
    shortcut?: RegExp;
    initialMessage: string;
    initialQuickActionId: string;
  };
  steps: AutomationStep[];
  cancellationMessage?: string;
  isComposerMode: (composerQuickActionId?: string | null) => boolean;
  isInitialRun: (quickActionId?: string) => boolean;
  isFlowMessage: (quickActionId?: string) => boolean;
};

export function getInitialRunStep(definition: AutomationDefinition): InitialRunStep | undefined {
  return definition.steps.find((step): step is InitialRunStep => step.kind === "initialRun");
}

export function getFollowUpPromptSteps(definition: AutomationDefinition): FollowUpPromptStep[] {
  return definition.steps.filter((step): step is FollowUpPromptStep => step.kind === "followUpPrompt");
}

export function getFollowUpPromptStep(
  definition: AutomationDefinition,
  stepId: string,
): FollowUpPromptStep | undefined {
  return getFollowUpPromptSteps(definition).find((step) => step.id === stepId);
}

export function getFollowUpQuestionnaireSteps(
  definition: AutomationDefinition,
): FollowUpQuestionnaireStep[] {
  return definition.steps.filter(
    (step): step is FollowUpQuestionnaireStep => step.kind === "followUpQuestionnaire",
  );
}

export function getFollowUpQuestionnaireStep(
  definition: AutomationDefinition,
  stepId: string,
): FollowUpQuestionnaireStep | undefined {
  return getFollowUpQuestionnaireSteps(definition).find((step) => step.id === stepId);
}

export function getConfirmationRunStep(definition: AutomationDefinition): ConfirmationRunStep | undefined {
  return definition.steps.find((step): step is ConfirmationRunStep => step.kind === "confirmationRun");
}

export function getPostInitialRunStep(
  definition: AutomationDefinition,
): FollowUpPromptStep | FollowUpQuestionnaireStep | undefined {
  return definition.steps.find(
    (step): step is FollowUpPromptStep | FollowUpQuestionnaireStep =>
      step.kind === "followUpPrompt" || step.kind === "followUpQuestionnaire",
  );
}
