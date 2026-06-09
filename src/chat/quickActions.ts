import {
  DAILY_CAPTURE_ACTION_ID,
  shouldShowDailyCaptureChip,
} from "./dailyCapture";
import {
  GOOD_MORNING_ACTION_ID,
  GOOD_MORNING_LABEL,
  isMorningReviewChipVisible,
  MORNING_REVIEW_MESSAGE,
} from "./morningReview";
import {
  GOOD_NIGHT_ACTION_ID,
  GOOD_NIGHT_LABEL,
  GOOD_NIGHT_MESSAGE,
} from "./goodNight";

export type QuickActionBehavior = "send" | "prefill";

export interface QuickAction {
  id: string;
  label: string;
  message: string;
  behavior: QuickActionBehavior;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: GOOD_MORNING_ACTION_ID,
    label: GOOD_MORNING_LABEL,
    behavior: "send",
    message: MORNING_REVIEW_MESSAGE,
  },
  {
    id: "daily-capture",
    label: "Daily capture",
    behavior: "prefill",
    message: "",
  },
  {
    id: "standup",
    label: "Standup",
    behavior: "send",
    message:
      "Standup prep: what did I complete recently in Linear, what's in progress, and what's blocked?",
  },
  {
    id: GOOD_NIGHT_ACTION_ID,
    label: GOOD_NIGHT_LABEL,
    behavior: "send",
    message: GOOD_NIGHT_MESSAGE,
  },
];

export function getVisibleQuickActions(
  now: Date = new Date(),
  options?: { composerText?: string },
): QuickAction[] {
  const showMorningReview = isMorningReviewChipVisible(now);
  const showDailyCapture = shouldShowDailyCaptureChip(options?.composerText ?? "");

  return QUICK_ACTIONS.filter((action) => {
    if (action.id === GOOD_MORNING_ACTION_ID) return showMorningReview;
    if (action.id === DAILY_CAPTURE_ACTION_ID) return showDailyCapture;
    return true;
  });
}
