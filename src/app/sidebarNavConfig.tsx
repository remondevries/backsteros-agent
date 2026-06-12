import type { ReactNode } from "react";
import { VAULT_NAV_ITEMS, type VaultNavItemId, vaultNavItemLabel } from "../lib/vaultNavFolders";
import {
  type SidebarNavItemId,
  sidebarNavItemLabel as labelForSidebarNavItem,
} from "../lib/sidebarNavItems";
import {
  SidebarContactsIcon,
  SidebarDailyIcon,
  SidebarFinancialsIcon,
  SidebarInboxIcon,
  SidebarKnowledgeBaseIcon,
  SidebarLettersIcon,
  SidebarMeetingsIcon,
  SidebarOrganizationsIcon,
  SidebarProjectsIcon,
  SidebarWorkoutsIcon,
} from "./SidebarNavIcons";

export type { SidebarNavItemId };

export interface SidebarNavItemDefinition {
  id: SidebarNavItemId;
  label: string;
  icon: ReactNode;
}

export interface SidebarNavSectionDefinition {
  id: "workspace" | "people";
  label: string;
  items: SidebarNavItemDefinition[];
}

const VAULT_NAV_ICONS: Record<VaultNavItemId, ReactNode> = {
  inbox: <SidebarInboxIcon />,
  daily: <SidebarDailyIcon />,
  workouts: <SidebarWorkoutsIcon />,
  meetings: <SidebarMeetingsIcon />,
  financials: <SidebarFinancialsIcon />,
  "knowledge-base": <SidebarKnowledgeBaseIcon />,
  letters: <SidebarLettersIcon />,
  organizations: <SidebarOrganizationsIcon />,
  contacts: <SidebarContactsIcon />,
};

function navItem(id: VaultNavItemId): SidebarNavItemDefinition {
  return {
    id,
    label: vaultNavItemLabel(id),
    icon: VAULT_NAV_ICONS[id],
  };
}

function projectsNavItem(): SidebarNavItemDefinition {
  return {
    id: "projects",
    label: labelForSidebarNavItem("projects"),
    icon: <SidebarProjectsIcon />,
  };
}

export const SIDEBAR_PRIMARY_ITEMS: SidebarNavItemDefinition[] = [
  navItem("inbox"),
  navItem("daily"),
  navItem("workouts"),
];

export const SIDEBAR_SECTIONS: SidebarNavSectionDefinition[] = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      projectsNavItem(),
      navItem("meetings"),
      navItem("financials"),
      navItem("knowledge-base"),
      navItem("letters"),
    ],
  },
  {
    id: "people",
    label: "People",
    items: [navItem("organizations"), navItem("contacts")],
  },
];

export const SIDEBAR_VAULT_NAV_ITEM_IDS = VAULT_NAV_ITEMS.map((item) => item.id);
