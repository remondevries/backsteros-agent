import { describe, expect, test } from "bun:test";
import {
  AUTOMATION_FLOW_CANCELLATION_DEFAULT,
  formatAutomationFlowCancellationMessage,
  getAutomationDefinition,
  GOOD_MORNING_AUTOMATION,
  GOOD_NIGHT_AUTOMATION,
  DAILY_CAPTURE_AUTOMATION,
  GROCERY_LIST_AUTOMATION,
} from "./registry";
import {
  getConfirmationRunStep,
  getFollowUpPromptSteps,
  getFollowUpQuestionnaireSteps,
  getInitialRunStep,
} from "./types";

describe("automation registry", () => {
  test("defines the good morning flow template", () => {
    expect(getAutomationDefinition("good-morning")).toBe(GOOD_MORNING_AUTOMATION);

    const initialRun = getInitialRunStep(GOOD_MORNING_AUTOMATION);
    expect(initialRun?.quickActionId).toBe("good-morning");
    expect(initialRun?.sourceBrand).toBe("backster");

    const followUp = getFollowUpPromptSteps(GOOD_MORNING_AUTOMATION);
    expect(followUp).toHaveLength(2);
    expect(followUp[0]?.id).toBe("wake");
    expect(followUp[0]?.answerQuickActionId).toBe("good-morning-wake");
    expect(followUp[1]?.id).toBe("feel");
    expect(followUp[1]?.answerQuickActionId).toBe("good-morning-feel");

    const confirmation = getConfirmationRunStep(GOOD_MORNING_AUTOMATION);
    expect(confirmation?.answerQuickActionId).toBe("good-morning-feel");
  });

  test("uses custom cancellation copy for good morning", () => {
    expect(formatAutomationFlowCancellationMessage("good-morning")).toBe(
      "Okay, I will skip this answer, enjoy the rest of your day!",
    );
    expect(formatAutomationFlowCancellationMessage("daily-capture")).toBe(
      AUTOMATION_FLOW_CANCELLATION_DEFAULT,
    );
  });

  test("defines the good night flow template", () => {
    expect(getAutomationDefinition("good-night")).toBe(GOOD_NIGHT_AUTOMATION);

    const initialRun = getInitialRunStep(GOOD_NIGHT_AUTOMATION);
    expect(initialRun?.quickActionId).toBe("good-night");
    expect(initialRun?.sourceBrand).toBe("backster");

    const questionnaire = getFollowUpQuestionnaireSteps(GOOD_NIGHT_AUTOMATION);
    expect(questionnaire).toHaveLength(1);
    expect(questionnaire[0]?.id).toBe("reflection");
    expect(questionnaire[0]?.questions).toHaveLength(5);
    expect(questionnaire[0]?.submitQuickActionId).toBe("good-night-reflection");

    const confirmation = getConfirmationRunStep(GOOD_NIGHT_AUTOMATION);
    expect(confirmation?.answerQuickActionId).toBe("good-night-reflection");
  });

  test("defines the daily capture flow template", () => {
    expect(getAutomationDefinition("daily-capture")).toBe(DAILY_CAPTURE_AUTOMATION);
    expect(getInitialRunStep(DAILY_CAPTURE_AUTOMATION)).toBeUndefined();
    expect(getConfirmationRunStep(DAILY_CAPTURE_AUTOMATION)?.answerQuickActionId).toBe(
      "daily-capture",
    );
  });

  test("defines the grocery list flow template", () => {
    expect(getAutomationDefinition("grocery-list")).toBe(GROCERY_LIST_AUTOMATION);
    expect(getInitialRunStep(GROCERY_LIST_AUTOMATION)).toBeUndefined();
    expect(getConfirmationRunStep(GROCERY_LIST_AUTOMATION)?.answerQuickActionId).toBe(
      "grocery-list",
    );
  });
});
