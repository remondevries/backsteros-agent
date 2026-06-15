export type VaultFolderFilterMode =
  | "contacts"
  | "letters"
  | "meetings"
  | "inbox"
  | "financials"
  | "kb";

export type CommandPaletteFilterMode =
  | "all"
  | "projects"
  | "documents"
  | "organizations"
  | VaultFolderFilterMode;

export type CommandPaletteFilterState = {
  mode: CommandPaletteFilterMode;
  searchTerm: string;
};

const VAULT_FOLDER_FILTER_PREFIXES: Record<string, VaultFolderFilterMode> = {
  c: "contacts",
  l: "letters",
  m: "meetings",
  i: "inbox",
  f: "financials",
  k: "kb",
};

const VAULT_FOLDER_FILTER_MODES = new Set<VaultFolderFilterMode>(
  Object.values(VAULT_FOLDER_FILTER_PREFIXES),
);

export function isVaultFolderFilterMode(
  mode: CommandPaletteFilterMode,
): mode is VaultFolderFilterMode {
  return VAULT_FOLDER_FILTER_MODES.has(mode as VaultFolderFilterMode);
}

export function createDefaultCommandPaletteFilterState(): CommandPaletteFilterState {
  return { mode: "all", searchTerm: "" };
}

/**
 * Apply a raw input change while in "all" mode. Returns null when the value is unchanged.
 * Activates scoped filters on prefix + space (e.g. `p ` projects, `m ` meetings).
 */
export function applyAllModeInputChange(
  value: string,
  current: CommandPaletteFilterState,
): CommandPaletteFilterState | null {
  if (value === current.searchTerm) return null;

  if (value.startsWith("p ")) {
    return { mode: "projects", searchTerm: value.slice(2) };
  }

  if (value.startsWith("d ")) {
    return { mode: "documents", searchTerm: value.slice(2) };
  }

  if (value.startsWith("o ")) {
    return { mode: "organizations", searchTerm: value.slice(2) };
  }

  for (const [prefix, mode] of Object.entries(VAULT_FOLDER_FILTER_PREFIXES)) {
    const token = `${prefix} `;
    if (value.startsWith(token)) {
      return { mode, searchTerm: value.slice(token.length) };
    }
  }

  return { mode: "all", searchTerm: value };
}

export function applyProjectsModeInputChange(
  value: string,
  current: CommandPaletteFilterState,
): CommandPaletteFilterState | null {
  if (value === current.searchTerm) return null;
  return { mode: "projects", searchTerm: value };
}

export function applyDocumentsModeInputChange(
  value: string,
  current: CommandPaletteFilterState,
): CommandPaletteFilterState | null {
  if (value === current.searchTerm) return null;
  return { mode: "documents", searchTerm: value };
}

export function applyOrganizationsModeInputChange(
  value: string,
  current: CommandPaletteFilterState,
): CommandPaletteFilterState | null {
  if (value === current.searchTerm) return null;
  return { mode: "organizations", searchTerm: value };
}

export function applyVaultFolderModeInputChange(
  value: string,
  current: CommandPaletteFilterState,
): CommandPaletteFilterState | null {
  if (!isVaultFolderFilterMode(current.mode)) return null;
  if (value === current.searchTerm) return null;
  return { mode: current.mode, searchTerm: value };
}

export function exitProjectsFilterMode(
  current: CommandPaletteFilterState,
): CommandPaletteFilterState | null {
  if (current.mode !== "projects") return null;
  return { mode: "all", searchTerm: current.searchTerm };
}

export function exitDocumentsFilterMode(
  current: CommandPaletteFilterState,
): CommandPaletteFilterState | null {
  if (current.mode !== "documents") return null;
  return { mode: "all", searchTerm: current.searchTerm };
}

export function exitOrganizationsFilterMode(
  current: CommandPaletteFilterState,
): CommandPaletteFilterState | null {
  if (current.mode !== "organizations") return null;
  return { mode: "all", searchTerm: current.searchTerm };
}

export function exitVaultFolderFilterMode(
  current: CommandPaletteFilterState,
): CommandPaletteFilterState | null {
  if (!isVaultFolderFilterMode(current.mode)) return null;
  return { mode: "all", searchTerm: current.searchTerm };
}
