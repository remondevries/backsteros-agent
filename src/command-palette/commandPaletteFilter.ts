export type CommandPaletteFilterMode = "all" | "projects";

export type CommandPaletteFilterState = {
  mode: CommandPaletteFilterMode;
  searchTerm: string;
};

export function createDefaultCommandPaletteFilterState(): CommandPaletteFilterState {
  return { mode: "all", searchTerm: "" };
}

/**
 * Apply a raw input change while in "all" mode. Returns null when the value is unchanged.
 * Activates project filter on exact `p` or prefix `p `.
 */
export function applyAllModeInputChange(
  value: string,
  current: CommandPaletteFilterState,
): CommandPaletteFilterState | null {
  if (value === current.searchTerm) return null;

  if (value === "p") {
    return { mode: "projects", searchTerm: "" };
  }

  if (value.startsWith("p ")) {
    return { mode: "projects", searchTerm: value.slice(2) };
  }

  return { mode: "all", searchTerm: value };
}

/**
 * Apply a raw input change while in "projects" mode.
 */
export function applyProjectsModeInputChange(
  value: string,
  current: CommandPaletteFilterState,
): CommandPaletteFilterState | null {
  if (value === current.searchTerm) return null;
  return { mode: "projects", searchTerm: value };
}

export function exitProjectsFilterMode(
  current: CommandPaletteFilterState,
): CommandPaletteFilterState | null {
  if (current.mode !== "projects") return null;
  return { mode: "all", searchTerm: current.searchTerm };
}
