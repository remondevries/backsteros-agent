import {
  AUTOMATION_FLOW_CANCELLATION_DEFAULT,
  formatAutomationFlowCancellationMessage,
} from "./automation/registry";
import type { AutomationFlowId } from "./automation/types";
import { DAILY_CAPTURE_LABEL, isDailyCaptureMessage } from "./dailyCapture";
import { GROCERY_LIST_LABEL, isGroceryListMessage } from "./groceryList";
import { GOOD_MORNING_LABEL, isGoodMorningComposerMode } from "./morningReview";
import {
  LETTER_CONFIRM_ACTION_ID,
  LETTER_LABEL,
  isLetterComposerMode,
  isLetterConfirmMessage,
  isLetterMessage,
} from "./letter";
import {
  DELETE_FILE_LABEL,
  isDeleteFileComposerMode,
  isDeleteFileMessage,
} from "./deleteFile";
import { GOOD_NIGHT_LABEL, isGoodNightComposerMode } from "./goodNight";

export type { AutomationFlowId };
export { AUTOMATION_FLOW_CANCELLATION_DEFAULT, formatAutomationFlowCancellationMessage };

export type AutomationFlowTagVariant = AutomationFlowId;

export function resolveActiveAutomationFlow(
  composerQuickActionId?: string | null,
): AutomationFlowId | null {
  if (isDailyCaptureMessage(composerQuickActionId ?? undefined)) {
    return "daily-capture";
  }
  if (isGroceryListMessage(composerQuickActionId ?? undefined)) {
    return "grocery-list";
  }
  if (isGoodMorningComposerMode(composerQuickActionId)) {
    return "good-morning";
  }
  if (isGoodNightComposerMode(composerQuickActionId)) {
    return "good-night";
  }
  if (isLetterComposerMode(composerQuickActionId)) {
    return "letter";
  }
  if (isDeleteFileComposerMode(composerQuickActionId)) {
    return "delete-file";
  }
  return null;
}

export function isAutomationComposerFlow(composerQuickActionId?: string | null): boolean {
  return resolveActiveAutomationFlow(composerQuickActionId) != null;
}

export function automationFlowDisplayName(flowId: AutomationFlowId): string {
  switch (flowId) {
    case "daily-capture":
      return DAILY_CAPTURE_LABEL;
    case "grocery-list":
      return GROCERY_LIST_LABEL;
    case "good-morning":
      return GOOD_MORNING_LABEL;
    case "good-night":
      return GOOD_NIGHT_LABEL;
    case "letter":
      return "Letter";
    case "delete-file":
      return DELETE_FILE_LABEL;
  }
}
