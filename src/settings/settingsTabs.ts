export type SettingsTabId =
  | "general"
  | "obsidian"
  | "cursor"
  | "linear"
  | "gemini"
  | "google-calendar";

export type SettingsTabGroup = "general" | "integration";

export const SETTINGS_TABS: {
  id: SettingsTabId;
  label: string;
  description: string;
  group: SettingsTabGroup;
}[] = [
  {
    id: "general",
    label: "General",
    description: "Profiles, accessibility, and composer",
    group: "general",
  },
  {
    id: "obsidian",
    label: "Obsidian",
    description: "Notes folder and vault name",
    group: "integration",
  },
  {
    id: "cursor",
    label: "Cursor",
    description: "API key for chat",
    group: "integration",
  },
  {
    id: "linear",
    label: "Linear",
    description: "API key and app preferences",
    group: "integration",
  },
  {
    id: "gemini",
    label: "Gemini",
    description: "API key for lookup",
    group: "integration",
  },
  {
    id: "google-calendar",
    label: "Google Calendar",
    description: "OAuth and calendar access",
    group: "integration",
  },
];
