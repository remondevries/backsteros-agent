// Keep in sync with sidecar/src/tool-routing.ts — decides which tools load per message.

export interface ToolSelection {
  obsidian: boolean;
  linear: boolean;
  calendar: boolean;
  whoop: boolean;
}

export type ToolToggleState = "auto" | "on" | "off";

export type ToolPinSelection = Partial<Record<keyof ToolSelection, ToolToggleState>>;

export const EMPTY_TOOL_PINS: ToolPinSelection = {};

const LINEAR_PATTERNS: RegExp[] = [
  /\blinear\b/i,
  /\biss?ues?\b/i,
  /\btickets?\b/i,
  /\bbacklog\b/i,
  /\bsprints?\b/i,
  /\bstand[- ]?up\b/i,
  /\b[A-Z]{2,}-\d+\b/,
];

const CALENDAR_PATTERNS: RegExp[] = [
  /\bcalendar\b/i,
  /\bgoogle calendar\b/i,
  /\bschedule\b/i,
  /\bscheduling\b/i,
  /\bmeeting\b/i,
  /\bmeetings\b/i,
  /\bappointment\b/i,
  /\bappointments\b/i,
  /\bevent\b/i,
  /\bevents\b/i,
  /\bavailability\b/i,
  /\bfree\b/i,
  /\bbusy\b/i,
  /\btime slot\b/i,
  /\btime slots\b/i,
  /\bwhat(?:'s| is) on my (?:calendar|agenda)\b/i,
  /\b(am|are) i free\b/i,
];

const WHOOP_PATTERNS: RegExp[] = [
  /\bwhoop\b/i,
  /\btotem\b/i,
  /\brecovery score\b/i,
  /\brecovery:\s*\d/i,
  /\bsleep performance\b/i,
  /\bsleep score\b/i,
  /\bsleep:\s*\d/i,
  /\bday strain\b/i,
  /\bstrain:\s*\d/i,
  /\bhrv\b/i,
  /\bresting heart rate\b/i,
  /\brhr\b/i,
  /\bworkouts?\b/i,
];

const OBSIDIAN_PATTERNS: RegExp[] = [
  /\bnotes?\b/i,
  /\bvault\b/i,
  /\bobsidian\b/i,
  /\bdaily\b/i,
  /\bjournal\b/i,
  /\bmarkdown\b/i,
  /\.md\b/i,
  /\bfiles?\b/i,
  /\bfolders?\b/i,
  /\bdirector(?:y|ies)\b/i,
  /\bto-?dos?\b/i,
  /\btasks?\b/i,
  /\b(write|append|save|jot|log)\b/i,
  /\b(capture|remember|agenda|tomorrow|inbox)\b/i,
  /\bthis week\b/i,
  /\b(read|open|show|list|find|search)\b/i,
  /\b(shell|terminal|command|git|grep|wc|sort|head|tail)\b/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

export function selectTools(text: string): ToolSelection {
  return {
    linear: matchesAny(text, LINEAR_PATTERNS),
    calendar: matchesAny(text, CALENDAR_PATTERNS),
    whoop: matchesAny(text, WHOOP_PATTERNS),
    obsidian: matchesAny(text, OBSIDIAN_PATTERNS),
  };
}

function resolvePin(
  pin: ToolToggleState | undefined,
  detected: boolean,
): boolean {
  if (pin === "on") return true;
  if (pin === "off") return false;
  return detected;
}

export function resolveToolSelection(
  text: string,
  pins?: ToolPinSelection | null,
): ToolSelection {
  const detected = selectTools(text);
  if (!pins) {
    return detected;
  }

  return {
    obsidian: resolvePin(pins.obsidian, detected.obsidian),
    linear: resolvePin(pins.linear, detected.linear),
    calendar: resolvePin(pins.calendar, detected.calendar),
    whoop: resolvePin(pins.whoop, detected.whoop),
  };
}

export function cycleToolPin(current: ToolToggleState | undefined): ToolToggleState {
  if (current === "on") return "off";
  if (current === "off") return "auto";
  return "on";
}

export function hasManualToolPins(pins: ToolPinSelection): boolean {
  return Object.values(pins).some((pin) => pin && pin !== "auto");
}
