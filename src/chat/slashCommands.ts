import { DAILY_CAPTURE_LABEL } from "./dailyCapture";
import { GROCERY_LIST_LABEL } from "./groceryList";
import { DELETE_FILE_LABEL } from "./deleteFile";
import { GOOD_NIGHT_LABEL } from "./goodNight";
import { LETTER_LABEL } from "./letter";
import {
  GOOD_MORNING_LABEL,
  isMorningReviewChipVisible,
} from "./morningReview";

export type SlashCommandContext = "chat" | "lookup";

export type SlashCommandId =
  | "good-morning"
  | "daily-capture"
  | "grocery-list"
  | "good-night"
  | "letter"
  | "delete-file"
  | "clear";

export type SlashCommandDefinition = {
  id: SlashCommandId;
  label: string;
  description: string;
  triggers: string[];
  contexts: SlashCommandContext[];
  isVisible?: (now: Date) => boolean;
};

export const SLASH_COMMANDS: SlashCommandDefinition[] = [
  {
    id: "good-morning",
    label: GOOD_MORNING_LABEL,
    description: "Morning review — Linear, calendar, and Whoop snapshot",
    triggers: ["gm"],
    contexts: ["chat"],
    isVisible: isMorningReviewChipVisible,
  },
  {
    id: "daily-capture",
    label: DAILY_CAPTURE_LABEL,
    description: "Log a moment to today's daily note",
    triggers: ["dc"],
    contexts: ["chat"],
  },
  {
    id: "grocery-list",
    label: GROCERY_LIST_LABEL,
    description: "Add items to this week's Linear grocery list",
    triggers: ["gr", "grocery"],
    contexts: ["chat"],
  },
  {
    id: "good-night",
    label: GOOD_NIGHT_LABEL,
    description: "Evening reflection and daily note wrap-up",
    triggers: ["gn"],
    contexts: ["chat"],
  },
  {
    id: "letter",
    label: LETTER_LABEL,
    description: "File an attached PDF letter to your vault",
    triggers: ["letter"],
    contexts: ["chat"],
  },
  {
    id: "delete-file",
    label: DELETE_FILE_LABEL,
    description: "Delete a note or file from your vault",
    triggers: ["d", "delete"],
    contexts: ["chat"],
  },
  {
    id: "clear",
    label: "Clear chat",
    description: "Clear this session's messages and start fresh",
    triggers: ["clear"],
    contexts: ["chat", "lookup"],
  },
];

export function parseSlashCommandInput(text: string): { query: string } | null {
  const match = text.match(/^\/([^\s]*)$/);
  if (!match) return null;
  return { query: match[1].toLowerCase() };
}

function slashCommandMatchesQuery(command: SlashCommandDefinition, query: string): boolean {
  if (!query) return true;
  const normalizedQuery = query.toLowerCase();
  if (command.triggers.some((trigger) => trigger.toLowerCase().startsWith(normalizedQuery))) {
    return true;
  }
  if (command.label.toLowerCase().includes(normalizedQuery)) {
    return true;
  }
  return command.id.includes(normalizedQuery);
}

export function filterSlashCommands(
  query: string,
  options: { now?: Date; context?: SlashCommandContext } = {},
): SlashCommandDefinition[] {
  const now = options.now ?? new Date();
  const context = options.context ?? "chat";
  return SLASH_COMMANDS.filter((command) => {
    if (!command.contexts.includes(context)) return false;
    if (command.isVisible && !command.isVisible(now)) return false;
    return slashCommandMatchesQuery(command, query);
  });
}

export function isSlashCommandPaletteOpen(
  text: string,
  options: { now?: Date; enabled?: boolean; context?: SlashCommandContext } = {},
): boolean {
  if (options.enabled === false) return false;
  const slashState = parseSlashCommandInput(text);
  if (!slashState) return false;
  return filterSlashCommands(slashState.query, {
    now: options.now,
    context: options.context,
  }).length > 0;
}

export function formatSlashCommandTrigger(command: SlashCommandDefinition): string {
  return `/${command.triggers[0]}`;
}

export function formatSlashCommandTriggerHint(command: SlashCommandDefinition): string {
  if (command.triggers.length <= 1) return formatSlashCommandTrigger(command);
  return command.triggers.map((trigger) => `/${trigger}`).join(" · ");
}
