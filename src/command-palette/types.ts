import type { LinearIssueEntity } from "../chat/types";
import type { VaultNavItemId } from "../lib/vaultNavFolders";
import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import type { SettingsTabId } from "../settings/settingsTabs";
import type { VaultFolderFilterMode, CommandPaletteFilterMode } from "./commandPaletteFilter";

export type CommandPaletteSection =
  | "Navigate"
  | "Notes"
  | "Projects"
  | "Issues"
  | "Inbox"
  | "Linear documents"
  | "KB"
  | "Contacts"
  | "Organizations"
  | "Letters"
  | "Meetings"
  | "Financials";

export type CommandPaletteVaultNoteSection =
  | "Notes"
  | "Inbox"
  | "KB"
  | "Contacts"
  | "Letters"
  | "Meetings"
  | "Financials";

export const COMMAND_PALETTE_VAULT_FOLDER_FILTERS = {
  contacts: { navItemId: "contacts", section: "Contacts" },
  letters: { navItemId: "letters", section: "Letters" },
  meetings: { navItemId: "meetings", section: "Meetings" },
  inbox: { navItemId: "inbox", section: "Inbox" },
  financials: { navItemId: "financials", section: "Financials" },
  kb: { navItemId: "knowledge-base", section: "KB" },
} as const satisfies Record<
  VaultFolderFilterMode,
  { navItemId: VaultNavItemId; section: CommandPaletteVaultNoteSection }
>;

export type CommandPaletteItem =
  | {
      kind: "navigate";
      id: string;
      section: "Navigate";
      label: string;
      subtitle?: string;
      navItemId: SidebarNavItemId;
    }
  | {
      kind: "settings";
      id: string;
      section: "Navigate";
      label: string;
      subtitle?: string;
      settingsTab?: SettingsTabId;
    }
  | {
      kind: "vault-note";
      id: string;
      section: CommandPaletteVaultNoteSection;
      label: string;
      subtitle: string;
      path: string;
      title: string;
      navItemId: VaultNavItemId;
    }
  | {
      kind: "linear-issue";
      id: string;
      section: "Issues";
      label: string;
      subtitle?: string;
      issue: LinearIssueEntity;
    }
  | {
      kind: "linear-project";
      id: string;
      section: "Projects";
      label: string;
      subtitle?: string;
      projectId: string;
      projectName: string;
    }
  | {
      kind: "linear-document";
      id: string;
      section: "Linear documents";
      label: string;
      subtitle?: string;
      documentId: string;
      title: string;
      projectId?: string;
      projectName?: string;
    }
  | {
      kind: "linear-team";
      id: string;
      section: "Organizations";
      label: string;
      subtitle?: string;
      teamId: string;
      teamName: string;
      teamKey: string;
    }
  | {
      kind: "linear-customer";
      id: string;
      section: "Organizations";
      label: string;
      subtitle?: string;
      customerId: string;
      customerName: string;
    };

export const COMMAND_PALETTE_SECTIONS: CommandPaletteSection[] = [
  "Navigate",
  "Notes",
  "Projects",
  "Issues",
];

export const COMMAND_PALETTE_DOCUMENT_SECTIONS: CommandPaletteSection[] = [
  "Inbox",
  "Linear documents",
  "KB",
];

export function commandPaletteItemValue(item: CommandPaletteItem): string {
  return `${item.kind}:${item.id}`;
}

export function commandPaletteSectionsForMode(mode: CommandPaletteFilterMode): CommandPaletteSection[] {
  if (mode === "documents") return COMMAND_PALETTE_DOCUMENT_SECTIONS;
  if (mode === "projects") return ["Projects"];
  if (mode === "organizations") return ["Organizations"];
  if (mode in COMMAND_PALETTE_VAULT_FOLDER_FILTERS) {
    return [COMMAND_PALETTE_VAULT_FOLDER_FILTERS[mode as VaultFolderFilterMode].section];
  }
  return COMMAND_PALETTE_SECTIONS;
}
