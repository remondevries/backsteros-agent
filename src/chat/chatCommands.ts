export type ChatCommand = "clear";

export type LinearThreadChatCommand = "delete-thread";

export function parseChatCommand(text: string): ChatCommand | null {
  const normalized = text.trim().toLowerCase();
  if (normalized === "/clear" || normalized === "/delete") return "clear";
  return null;
}

export function parseLinearThreadChatCommand(text: string): LinearThreadChatCommand | null {
  const normalized = text.trim().toLowerCase();
  if (normalized === "/delete" || normalized === "/d" || normalized === "/clear") {
    return "delete-thread";
  }
  return null;
}
