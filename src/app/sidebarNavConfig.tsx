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

export function sidebarNavItemIcon(id: SidebarNavItemId): ReactNode {
  if (id === "projects") {
    return <SidebarProjectsIcon />;
  }
  return VAULT_NAV_ICONS[id];
}

function navItem(id: VaultNavItemId): SidebarNavItemDefinition {
  return {
    id,
    label: vaultNavItemLabel(id),
    icon: sidebarNavItemIcon(id),
  };
}

function projectsNavItem(): SidebarNavItemDefinition {
  return {
    id: "projects",
    label: labelForSidebarNavItem("projects"),
    icon: sidebarNavItemIcon("projects"),
  };
}

export const SIDEBAR_PRIMARY_ITEMS: SidebarNavItemDefinition[] = [
  navItem("inbox"),
  navItem("daily"),
  navItem("workouts"),
];

const SIDEBAR_PRIMARY_NAV_ITEM_IDS = new Set(
  SIDEBAR_PRIMARY_ITEMS.map((item) => item.id),
);

export function isSidebarPrimaryNavItem(
  id: SidebarNavItemId,
): id is (typeof SIDEBAR_PRIMARY_ITEMS)[number]["id"] {
  return SIDEBAR_PRIMARY_NAV_ITEM_IDS.has(id as (typeof SIDEBAR_PRIMARY_ITEMS)[number]["id"]);
}

/** Primary nav sections that show the content empty state until the user picks an item. */
export function shouldShowPrimaryNavEmptyState(id: SidebarNavItemId): boolean {
  return isSidebarPrimaryNavItem(id) && id !== "daily";
}

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
