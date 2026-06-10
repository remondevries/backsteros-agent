import type { ReactNode } from "react";
import { BacksterIcon } from "../chat/BacksterIcon";
import { LinearIcon } from "../chat/LinearIcon";
import { GeminiIcon } from "../chat/GeminiIcon";
import { ObsidianIcon } from "../chat/ObsidianIcon";
import { WhoopIcon } from "../chat/WhoopIcon";

export type AppView = "lookup" | "chat" | "whoop" | "linear" | "obsidian";

export interface AppViewDefinition {
  id: AppView;
  label: string;
  icon: ReactNode;
  letter: string;
  number: string;
  lead?: boolean;
}

export const APP_VIEWS: AppViewDefinition[] = [
  {
    id: "lookup",
    label: "Gemini",
    icon: <GeminiIcon size={18} />,
    letter: "g",
    number: "0",
  },
  {
    id: "chat",
    label: "Backster",
    icon: <BacksterIcon size={18} />,
    letter: "b",
    number: "1",
    lead: true,
  },
  {
    id: "whoop",
    label: "Whoop",
    icon: <WhoopIcon size={18} />,
    letter: "w",
    number: "2",
  },
  {
    id: "linear",
    label: "Linear",
    icon: <LinearIcon size={18} />,
    letter: "l",
    number: "3",
  },
  {
    id: "obsidian",
    label: "Obsidian",
    icon: <ObsidianIcon size={18} />,
    letter: "o",
    number: "4",
  },
];

export function getAppViewIndex(view: AppView): number {
  return APP_VIEWS.findIndex((item) => item.id === view);
}

export function getAdjacentAppView(view: AppView, direction: "up" | "down"): AppView {
  const index = getAppViewIndex(view);
  if (index < 0) return view;

  const delta = direction === "up" ? -1 : 1;
  const nextIndex = (index + delta + APP_VIEWS.length) % APP_VIEWS.length;
  return APP_VIEWS[nextIndex]?.id ?? view;
}

export function buildGoToKeyHint(view: AppViewDefinition): string {
  return `G + ${view.letter.toUpperCase()}`;
}

export function findAppViewByLetter(letter: string): AppViewDefinition | undefined {
  return APP_VIEWS.find((view) => view.letter === letter.toLowerCase());
}
