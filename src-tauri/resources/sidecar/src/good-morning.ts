export const GOOD_MORNING_FEEL_ACTION_ID = "good-morning-feel";
export const GOOD_MORNING_WAKE_ACTION_ID = "good-morning-wake";

export const GOOD_MORNING_ASK_AGENT_PROMPT = `[Good morning — feel check setup]
Automated good morning tasks (Whoop, Linear, calendar, and day log metrics except wake time) are complete. The morning review UI shows their data. Wake time is collected separately before this step.

Your only job now: ask the user one warm, brief question in plain conversational language:
"How do you feel and how was your sleep?"

Do NOT write to their daily note yet. Do NOT apply Meditations-style writing to your reply. Wait for their response.`;

export function isGoodMorningFeelQuickAction(quickActionId?: string): boolean {
  return quickActionId === GOOD_MORNING_FEEL_ACTION_ID;
}

export function isGoodMorningWakeQuickAction(quickActionId?: string): boolean {
  return quickActionId === GOOD_MORNING_WAKE_ACTION_ID;
}
