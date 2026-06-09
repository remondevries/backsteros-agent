export type ChatCommand = "clear";

export function parseChatCommand(text: string): ChatCommand | null {
  const normalized = text.trim().toLowerCase();
  if (normalized === "/clear") return "clear";
  return null;
}
