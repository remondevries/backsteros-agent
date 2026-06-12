import type { LinearProjectHealth } from "./api";

export function linearProjectHealthLabel(health: LinearProjectHealth): string {
  switch (health) {
    case "onTrack":
      return "On track";
    case "atRisk":
      return "At risk";
    case "offTrack":
      return "Off track";
  }
}

export function linearProjectHealthClassName(health: LinearProjectHealth): string {
  return `linear-project-health--${health}`;
}
