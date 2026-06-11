import { describe, expect, test } from "bun:test";
import {
  AUTOMATION_FLOW_CANCELLATION_DEFAULT,
  formatAutomationFlowCancellationMessage,
} from "./automation/registry";
import {
  automationFlowDisplayName,
  isAutomationComposerFlow,
  resolveActiveAutomationFlow,
} from "./automationFlow";
import { DAILY_CAPTURE_ACTION_ID } from "./dailyCapture";
import { GROCERY_LIST_ACTION_ID } from "./groceryList";
import { GOOD_MORNING_ACTION_ID } from "./morningReview";
import { GOOD_NIGHT_ACTION_ID } from "./goodNight";
import { LETTER_CONFIRM_ACTION_ID } from "./letter";

describe("automationFlow", () => {
  test("resolves active automation flows from composer state", () => {
    expect(resolveActiveAutomationFlow(DAILY_CAPTURE_ACTION_ID)).toBe("daily-capture");
    expect(resolveActiveAutomationFlow(GROCERY_LIST_ACTION_ID)).toBe("grocery-list");
    expect(resolveActiveAutomationFlow(GOOD_MORNING_ACTION_ID)).toBe("good-morning");
    expect(resolveActiveAutomationFlow(GOOD_NIGHT_ACTION_ID)).toBe("good-night");
    expect(resolveActiveAutomationFlow(LETTER_CONFIRM_ACTION_ID)).toBe("letter");
    expect(resolveActiveAutomationFlow(null)).toBeNull();
  });

  test("formats cancellation copy with a default fallback", () => {
    expect(formatAutomationFlowCancellationMessage("daily-capture")).toBe(
      AUTOMATION_FLOW_CANCELLATION_DEFAULT,
    );
    expect(formatAutomationFlowCancellationMessage("good-night")).toBe(
      AUTOMATION_FLOW_CANCELLATION_DEFAULT,
    );
    expect(formatAutomationFlowCancellationMessage("good-morning")).toBe(
      "Okay, I will skip this answer, enjoy the rest of your day!",
    );
    expect(automationFlowDisplayName("good-morning")).toBe("Good morning");
    expect(automationFlowDisplayName("grocery-list")).toBe("Grocery list");
    expect(isAutomationComposerFlow(GOOD_MORNING_ACTION_ID)).toBe(true);
  });
});
