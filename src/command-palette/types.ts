import type { LinearIssueEntity } from "../chat/types";
import type { VaultNavItemId } from "../lib/vaultNavFolders";
import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import type { SettingsTabId } from "../settings/settingsTabs";

export type CommandPaletteSection = "Navigate" | "Notes" | "Issues" | "Projects";

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
      section: "Notes";
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
    };

export const COMMAND_PALETTE_SECTIONS: CommandPaletteSection[] = [
  "Navigate",
  "Notes",
  "Issues",
  "Projects",
];

export function commandPaletteItemValue(item: CommandPaletteItem): string {
  return `${item.kind}:${item.id}`;
}
