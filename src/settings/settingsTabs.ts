export type SettingsTabId =
  | "general"
  | "obsidian"
  | "cursor"
  | "linear"
  | "gemini"
  | "google-calendar"
  | "google-gmail";

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
    label: "Local vault",
    description: "Local notes folder and vault name",
    group: "integration",
  },
  {
    id: "linear",
    label: "Linear",
    description: "General, API key, and OAuth",
    group: "integration",
  },
  {
    id: "cursor",
    label: "Cursor",
    description: "API key for chat",
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
  {
    id: "google-gmail",
    label: "Google Gmail",
    description: "OAuth and inbox access",
    group: "integration",
  },
];
