import type { AutomationDefinition, AutomationFlowId, FollowUpPromptStep } from "./types";
import {
  getAutomationDefinition,
  getRegisteredAutomationFlowIds,
  resolveAutomationFlowByComposerMode,
  resolveAutomationFlowByInitialRun,
} from "./registry";
import {
  getFollowUpPromptSteps,
  getFollowUpQuestionnaireSteps,
  getInitialRunStep,
  getPostInitialRunStep,
} from "./types";

export type AutomationAwaitingState = Partial<Record<AutomationFlowId, string>>;

export function resolveAutomationFlowForOutgoingMessage({
  composerQuickActionId,
  awaitingState,
  quickActionId,
  inLetterMode,
  letterAwaitingConfirm,
  letterConfirmQuickActionId,
  dailyCaptureQuickActionId,
  isDailyCaptureShortcutSend,
  groceryListQuickActionId,
  isGroceryListShortcutSend,
  deleteFileQuickActionId,
  isDeleteFileShortcutSend,
  questionnaireSubmitPayload,
}: {
  composerQuickActionId: string | null;
  awaitingState: AutomationAwaitingState;
  quickActionId?: string;
  inLetterMode: boolean;
  letterAwaitingConfirm: boolean;
  letterConfirmQuickActionId: string;
  dailyCaptureQuickActionId?: string;
  isDailyCaptureShortcutSend: boolean;
  groceryListQuickActionId?: string;
  isGroceryListShortcutSend: boolean;
  deleteFileQuickActionId?: string;
  isDeleteFileShortcutSend: boolean;
  questionnaireSubmitPayload?: string | null;
}): {
  effectiveQuickActionId: string | undefined;
  awaitingFlowId: AutomationFlowId | undefined;
} {
  if (questionnaireSubmitPayload) {
    for (const flowId of getRegisteredAutomationFlowIds()) {
      const definition = getAutomationDefinition(flowId);
      const step = definition ? getFollowUpQuestionnaireSteps(definition)[0] : undefined;
      if (step) {
        return {
          effectiveQuickActionId: step.submitQuickActionId,
          awaitingFlowId: flowId,
        };
      }
    }
  }
  const registeredFlow = resolveAutomationFlowByComposerMode(composerQuickActionId);
  const awaitingAnswerQuickActionId = registeredFlow
    ? awaitingState[registeredFlow.id]
    : undefined;

  const effectiveQuickActionId =
    quickActionId ??
    (isDailyCaptureShortcutSend
      ? dailyCaptureQuickActionId
      : isGroceryListShortcutSend
        ? groceryListQuickActionId
        : isDeleteFileShortcutSend
          ? deleteFileQuickActionId
          : inLetterMode && letterAwaitingConfirm
            ? letterConfirmQuickActionId
            : awaitingAnswerQuickActionId ?? composerQuickActionId) ??
    undefined;

  return {
    effectiveQuickActionId,
    awaitingFlowId: registeredFlow?.id,
  };
}

export function shouldBlockRegisteredAutomationComposerSend({
  composerQuickActionId,
  awaitingState,
  quickActionId,
  rawText,
  questionnaireActive,
}: {
  composerQuickActionId: string | null;
  awaitingState: AutomationAwaitingState;
  quickActionId?: string;
  rawText: string;
  questionnaireActive?: boolean;
}): boolean {
  const definition = resolveAutomationFlowByComposerMode(composerQuickActionId);
  if (!definition) return false;

  const confirmationStep = definition.steps.find((step) => step.kind === "confirmationRun");
  if (
    confirmationStep &&
    composerQuickActionId === confirmationStep.answerQuickActionId
  ) {
    return false;
  }

  if (!getInitialRunStep(definition)) {
    return false;
  }

  return (
    !awaitingState[definition.id] &&
    !questionnaireActive &&
    !definition.isInitialRun(quickActionId) &&
    !(definition.trigger.shortcut?.test(rawText.trim()) ?? false)
  );
}

export function resolveAutomationFlowVariant(
  effectiveQuickActionId: string | undefined,
): AutomationDefinition["flowVariant"] | undefined {
  if (!effectiveQuickActionId) return undefined;

  for (const flowId of getRegisteredAutomationFlowIds()) {
    const definition = getAutomationDefinition(flowId);
    if (!definition) continue;

    const followUpSteps = getFollowUpPromptSteps(definition);
    const questionnaireSteps = getFollowUpQuestionnaireSteps(definition);
    const confirmationStep = definition.steps.find((step) => step.kind === "confirmationRun");

    if (
      definition.isInitialRun(effectiveQuickActionId) ||
      followUpSteps.some((step) => step.answerQuickActionId === effectiveQuickActionId) ||
      questionnaireSteps.some(
        (step) =>
          step.interimAnswerQuickActionId === effectiveQuickActionId ||
          step.submitQuickActionId === effectiveQuickActionId,
      ) ||
      confirmationStep?.answerQuickActionId === effectiveQuickActionId
    ) {
      return definition.flowVariant;
    }
  }

  return undefined;
}

export function resolveInitialRunFollowUpStep(
  definition: AutomationDefinition,
): import("./types").FollowUpPromptStep | import("./types").FollowUpQuestionnaireStep | undefined {
  return getPostInitialRunStep(definition);
}

export function resolveAutomationFlowForInitialRun(
  quickActionId?: string,
): AutomationDefinition | undefined {
  return resolveAutomationFlowByInitialRun(quickActionId);
}
