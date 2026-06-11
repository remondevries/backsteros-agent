import {
  GOOD_MORNING_ACTION_ID,
  GOOD_MORNING_FEEL_ACTION_ID,
  GOOD_MORNING_FEEL_PROMPT,
  GOOD_MORNING_LABEL,
  MORNING_REVIEW_MESSAGE,
  hasGoodMorningFeelPromptForRun,
  isGoodMorningComposerMode,
  isGoodMorningFlowMessage,
  isGoodMorningMessage,
} from "../morningReview";
import {
  DAILY_CAPTURE_ACTION_ID,
  DAILY_CAPTURE_LABEL,
  isDailyCaptureComposerMode,
  isDailyCaptureFlowMessage,
  isDailyCaptureMessage,
} from "../dailyCapture";
import {
  GROCERY_LIST_ACTION_ID,
  GROCERY_LIST_LABEL,
  isGroceryListComposerMode,
  isGroceryListFlowMessage,
  isGroceryListMessage,
} from "../groceryList";
import {
  GOOD_NIGHT_ACTION_ID,
  GOOD_NIGHT_LABEL,
  GOOD_NIGHT_MESSAGE,
  GOOD_NIGHT_REFLECTION_ACTION_ID,
  GOOD_NIGHT_REFLECTION_QUESTIONS,
  hasGoodNightReflectionStartedForRun,
  isGoodNightComposerMode,
  isGoodNightFlowMessage,
  isGoodNightMessage,
  serializeGoodNightReflectionAnswers,
} from "../goodNight";
import {
  LETTER_ACTION_ID,
  LETTER_CONFIRM_ACTION_ID,
  LETTER_LABEL,
  LETTER_MESSAGE,
  isLetterComposerMode,
  isLetterConfirmMessage,
  isLetterFlowMessage,
  isLetterMessage,
} from "../letter";
import {
  DELETE_FILE_ACTION_ID,
  DELETE_FILE_LABEL,
  isDeleteFileComposerMode,
  isDeleteFileFlowMessage,
  isDeleteFileMessage,
} from "../deleteFile";
import type { AutomationDefinition, AutomationFlowId } from "./types";

export const AUTOMATION_FLOW_CANCELLATION_DEFAULT =
  "Okay, I will skip this answer, and will wait for your next response...";

export const GOOD_MORNING_AUTOMATION: AutomationDefinition = {
  id: "good-morning",
  flowVariant: "good-morning",
  label: GOOD_MORNING_LABEL,
  trigger: {
    shortcut: /^\/gm\s*$/i,
    initialMessage: MORNING_REVIEW_MESSAGE,
    initialQuickActionId: GOOD_MORNING_ACTION_ID,
  },
  steps: [
    {
      kind: "initialRun",
      quickActionId: GOOD_MORNING_ACTION_ID,
      sourceBrand: "backster",
    },
    {
      kind: "followUpPrompt",
      id: "feel",
      prompt: GOOD_MORNING_FEEL_PROMPT,
      composerQuickActionId: GOOD_MORNING_ACTION_ID,
      answerQuickActionId: GOOD_MORNING_FEEL_ACTION_ID,
      hasPromptForRun: hasGoodMorningFeelPromptForRun,
      pacingKey: (runId) => `good-morning-feel-${runId}`,
    },
    {
      kind: "confirmationRun",
      answerQuickActionId: GOOD_MORNING_FEEL_ACTION_ID,
    },
  ],
  cancellationMessage: "Okay, I will skip this answer, enjoy the rest of your day!",
  isComposerMode: isGoodMorningComposerMode,
  isInitialRun: isGoodMorningMessage,
  isFlowMessage: isGoodMorningFlowMessage,
};

export const DAILY_CAPTURE_AUTOMATION: AutomationDefinition = {
  id: "daily-capture",
  flowVariant: "daily-capture",
  label: DAILY_CAPTURE_LABEL,
  trigger: {
    shortcut: /^\/dc(?:\s|$)/i,
    initialMessage: "",
    initialQuickActionId: DAILY_CAPTURE_ACTION_ID,
  },
  steps: [
    {
      kind: "confirmationRun",
      answerQuickActionId: DAILY_CAPTURE_ACTION_ID,
    },
  ],
  isComposerMode: isDailyCaptureComposerMode,
  isInitialRun: isDailyCaptureMessage,
  isFlowMessage: isDailyCaptureFlowMessage,
};

export const GROCERY_LIST_AUTOMATION: AutomationDefinition = {
  id: "grocery-list",
  flowVariant: "grocery-list",
  label: GROCERY_LIST_LABEL,
  trigger: {
    shortcut: /^\/(?:gr|grocery)(?:\s|$)/i,
    initialMessage: "",
    initialQuickActionId: GROCERY_LIST_ACTION_ID,
  },
  steps: [
    {
      kind: "confirmationRun",
      answerQuickActionId: GROCERY_LIST_ACTION_ID,
    },
  ],
  isComposerMode: isGroceryListComposerMode,
  isInitialRun: isGroceryListMessage,
  isFlowMessage: isGroceryListFlowMessage,
};

export const GOOD_NIGHT_AUTOMATION: AutomationDefinition = {
  id: "good-night",
  flowVariant: "good-night",
  label: GOOD_NIGHT_LABEL,
  trigger: {
    shortcut: /^\/gn\s*$/i,
    initialMessage: GOOD_NIGHT_MESSAGE,
    initialQuickActionId: GOOD_NIGHT_ACTION_ID,
  },
  steps: [
    {
      kind: "initialRun",
      quickActionId: GOOD_NIGHT_ACTION_ID,
      sourceBrand: "backster",
    },
    {
      kind: "followUpQuestionnaire",
      id: "reflection",
      questions: GOOD_NIGHT_REFLECTION_QUESTIONS,
      composerQuickActionId: GOOD_NIGHT_ACTION_ID,
      interimAnswerQuickActionId: GOOD_NIGHT_REFLECTION_ACTION_ID,
      submitQuickActionId: GOOD_NIGHT_REFLECTION_ACTION_ID,
      hasQuestionnaireStartedForRun: hasGoodNightReflectionStartedForRun,
      pacingKey: (runId) => `good-night-reflection-${runId}`,
      questionPacingKey: (runId, questionIndex) => `good-night-reflection-q${questionIndex + 1}-${runId}`,
      serializeAnswers: serializeGoodNightReflectionAnswers,
    },
    {
      kind: "confirmationRun",
      answerQuickActionId: GOOD_NIGHT_REFLECTION_ACTION_ID,
    },
  ],
  isComposerMode: isGoodNightComposerMode,
  isInitialRun: isGoodNightMessage,
  isFlowMessage: isGoodNightFlowMessage,
};

export const LETTER_AUTOMATION: AutomationDefinition = {
  id: "letter",
  flowVariant: "letter",
  label: LETTER_LABEL,
  trigger: {
    shortcut: /^\/letter\s*$/i,
    initialMessage: LETTER_MESSAGE,
    initialQuickActionId: LETTER_ACTION_ID,
  },
  steps: [
    {
      kind: "initialRun",
      quickActionId: LETTER_ACTION_ID,
      sourceBrand: "backster",
    },
    {
      kind: "confirmationRun",
      answerQuickActionId: LETTER_CONFIRM_ACTION_ID,
    },
  ],
  cancellationMessage: "Okay, I'll stop the letter filing flow for now.",
  isComposerMode: isLetterComposerMode,
  isInitialRun: isLetterMessage,
  isFlowMessage: isLetterFlowMessage,
};

export const DELETE_FILE_AUTOMATION: AutomationDefinition = {
  id: "delete-file",
  flowVariant: "delete-file",
  label: DELETE_FILE_LABEL,
  trigger: {
    shortcut: /^\/(?:d|delete)(?:\s|$)/i,
    initialMessage: "",
    initialQuickActionId: DELETE_FILE_ACTION_ID,
  },
  steps: [
    {
      kind: "confirmationRun",
      answerQuickActionId: DELETE_FILE_ACTION_ID,
    },
  ],
  cancellationMessage: "Okay, I cancelled the delete flow.",
  isComposerMode: isDeleteFileComposerMode,
  isInitialRun: isDeleteFileMessage,
  isFlowMessage: isDeleteFileFlowMessage,
};

export const AUTOMATION_DEFINITIONS: Partial<Record<AutomationFlowId, AutomationDefinition>> = {
  "good-morning": GOOD_MORNING_AUTOMATION,
  "good-night": GOOD_NIGHT_AUTOMATION,
  "daily-capture": DAILY_CAPTURE_AUTOMATION,
  "grocery-list": GROCERY_LIST_AUTOMATION,
  letter: LETTER_AUTOMATION,
  "delete-file": DELETE_FILE_AUTOMATION,
};

export function getAutomationDefinition(flowId: AutomationFlowId): AutomationDefinition | undefined {
  return AUTOMATION_DEFINITIONS[flowId];
}

export function getRegisteredAutomationFlowIds(): AutomationFlowId[] {
  return Object.keys(AUTOMATION_DEFINITIONS) as AutomationFlowId[];
}

export function resolveAutomationFlowByComposerMode(
  composerQuickActionId?: string | null,
): AutomationDefinition | undefined {
  return getRegisteredAutomationFlowIds()
    .map((flowId) => AUTOMATION_DEFINITIONS[flowId]!)
    .find((definition) => definition.isComposerMode(composerQuickActionId));
}

export function resolveAutomationFlowByInitialRun(
  quickActionId?: string,
): AutomationDefinition | undefined {
  if (!quickActionId) return undefined;
  return getRegisteredAutomationFlowIds()
    .map((flowId) => AUTOMATION_DEFINITIONS[flowId]!)
    .find((definition) => definition.isInitialRun(quickActionId));
}

export function formatAutomationFlowCancellationMessage(flowId: AutomationFlowId): string {
  const definition = getAutomationDefinition(flowId);
  return definition?.cancellationMessage ?? AUTOMATION_FLOW_CANCELLATION_DEFAULT;
}

export function parseRegisteredAutomationShortcut(text: string): AutomationDefinition | undefined {
  const trimmed = text.trim();
  return getRegisteredAutomationFlowIds()
    .map((flowId) => AUTOMATION_DEFINITIONS[flowId]!)
    .find((definition) => definition.trigger.shortcut?.test(trimmed));
}
