import { describe, expect, test } from "bun:test";
import { GOOD_MORNING_FEEL_ACTION_ID, GOOD_MORNING_ACTION_ID } from "../morningReview";
import { DAILY_CAPTURE_ACTION_ID } from "../dailyCapture";
import { GROCERY_LIST_ACTION_ID } from "../groceryList";
import { GOOD_NIGHT_ACTION_ID, GOOD_NIGHT_REFLECTION_ACTION_ID } from "../goodNight";
import { LETTER_CONFIRM_ACTION_ID } from "../letter";
import {
  resolveAutomationFlowForOutgoingMessage,
  resolveAutomationFlowVariant,
  shouldBlockRegisteredAutomationComposerSend,
} from "./orchestration";

describe("automation orchestration", () => {
  test("routes feel answers through the registered follow-up quick action", () => {
    const result = resolveAutomationFlowForOutgoingMessage({
      composerQuickActionId: GOOD_MORNING_ACTION_ID,
      awaitingState: { "good-morning": GOOD_MORNING_FEEL_ACTION_ID },
      quickActionId: undefined,
      inLetterMode: false,
      letterAwaitingConfirm: false,
      letterConfirmQuickActionId: "letter-confirm",
      isDailyCaptureShortcutSend: false,
      isGroceryListShortcutSend: false,
    });

    expect(result.effectiveQuickActionId).toBe(GOOD_MORNING_FEEL_ACTION_ID);
    expect(result.awaitingFlowId).toBe("good-morning");
  });

  test("routes good night reflection submit through questionnaire payload", () => {
    const payload = JSON.stringify({ version: 1, answers: [] });
    const result = resolveAutomationFlowForOutgoingMessage({
      composerQuickActionId: null,
      awaitingState: {},
      quickActionId: undefined,
      inLetterMode: false,
      letterAwaitingConfirm: false,
      letterConfirmQuickActionId: "letter-confirm",
      isDailyCaptureShortcutSend: false,
      isGroceryListShortcutSend: false,
      questionnaireSubmitPayload: payload,
    });

    expect(result.effectiveQuickActionId).toBe(GOOD_NIGHT_REFLECTION_ACTION_ID);
    expect(result.awaitingFlowId).toBe("good-night");
  });

  test("blocks stray composer input before follow-up is revealed", () => {
    expect(
      shouldBlockRegisteredAutomationComposerSend({
        composerQuickActionId: GOOD_MORNING_ACTION_ID,
        awaitingState: {},
        quickActionId: undefined,
        rawText: "hello",
      }),
    ).toBe(true);

    expect(
      shouldBlockRegisteredAutomationComposerSend({
        composerQuickActionId: GOOD_NIGHT_ACTION_ID,
        awaitingState: {},
        quickActionId: undefined,
        rawText: "hello",
        questionnaireActive: true,
      }),
    ).toBe(false);
  });

  test("allows daily capture messages while composer mode is active", () => {
    expect(
      shouldBlockRegisteredAutomationComposerSend({
        composerQuickActionId: DAILY_CAPTURE_ACTION_ID,
        awaitingState: {},
        quickActionId: undefined,
        rawText: "Checked in with the team",
      }),
    ).toBe(false);
  });

  test("routes grocery shortcut sends through grocery quick action", () => {
    const result = resolveAutomationFlowForOutgoingMessage({
      composerQuickActionId: null,
      awaitingState: {},
      quickActionId: undefined,
      inLetterMode: false,
      letterAwaitingConfirm: false,
      letterConfirmQuickActionId: "letter-confirm",
      isDailyCaptureShortcutSend: false,
      isGroceryListShortcutSend: true,
      groceryListQuickActionId: GROCERY_LIST_ACTION_ID,
    });

    expect(result.effectiveQuickActionId).toBe(GROCERY_LIST_ACTION_ID);
  });

  test("allows grocery list messages while composer mode is active", () => {
    expect(
      shouldBlockRegisteredAutomationComposerSend({
        composerQuickActionId: GROCERY_LIST_ACTION_ID,
        awaitingState: {},
        quickActionId: undefined,
        rawText: "milk, eggs and bread",
      }),
    ).toBe(false);
  });

  test("routes letter confirm replies through letter-confirm quick action", () => {
    const result = resolveAutomationFlowForOutgoingMessage({
      composerQuickActionId: LETTER_CONFIRM_ACTION_ID,
      awaitingState: {},
      quickActionId: undefined,
      inLetterMode: true,
      letterAwaitingConfirm: true,
      letterConfirmQuickActionId: LETTER_CONFIRM_ACTION_ID,
      isDailyCaptureShortcutSend: false,
      isGroceryListShortcutSend: false,
    });

    expect(result.effectiveQuickActionId).toBe(LETTER_CONFIRM_ACTION_ID);
    expect(result.awaitingFlowId).toBe("letter");
  });

  test("allows letter confirm messages while composer mode is active", () => {
    expect(
      shouldBlockRegisteredAutomationComposerSend({
        composerQuickActionId: LETTER_CONFIRM_ACTION_ID,
        awaitingState: {},
        quickActionId: undefined,
        rawText: "assigned is Remon de Vries",
      }),
    ).toBe(false);
  });

  test("resolves flow variants for initial and follow-up quick actions", () => {
    expect(resolveAutomationFlowVariant(GOOD_MORNING_ACTION_ID)).toBe("good-morning");
    expect(resolveAutomationFlowVariant(GOOD_MORNING_FEEL_ACTION_ID)).toBe("good-morning");
    expect(resolveAutomationFlowVariant(GOOD_NIGHT_ACTION_ID)).toBe("good-night");
    expect(resolveAutomationFlowVariant(GOOD_NIGHT_REFLECTION_ACTION_ID)).toBe("good-night");
    expect(resolveAutomationFlowVariant(DAILY_CAPTURE_ACTION_ID)).toBe("daily-capture");
    expect(resolveAutomationFlowVariant(GROCERY_LIST_ACTION_ID)).toBe("grocery-list");
    expect(resolveAutomationFlowVariant(LETTER_CONFIRM_ACTION_ID)).toBe("letter");
  });
});
