import type { ReactNode } from "react";
import { isLinearProductMode } from "../lib/productMode";
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

const FULL_MODE_PRIMARY_ITEMS: SidebarNavItemDefinition[] = [
  navItem("inbox"),
  navItem("daily"),
  navItem("workouts"),
];

/** @deprecated Prefer getSidebarPrimaryItems for linear team configuration. */
export const SIDEBAR_PRIMARY_ITEMS: SidebarNavItemDefinition[] = isLinearProductMode()
  ? []
  : FULL_MODE_PRIMARY_ITEMS;

export type LinearSidebarTeamConfig = {
  inboxLinearTeamId?: string | null;
  dailyLinearTeamId?: string | null;
  workoutsLinearTeamId?: string | null;
  lettersLinearTeamId?: string | null;
  knowledgeBaseLinearTeamId?: string | null;
  addressbookLinearTeamId?: string | null;
};

export function getSidebarPrimaryItems(
  config?: LinearSidebarTeamConfig,
): SidebarNavItemDefinition[] {
  if (isLinearProductMode()) {
    const items: SidebarNavItemDefinition[] = [];
    if (config?.inboxLinearTeamId?.trim()) {
      items.push(navItem("inbox"));
    }
    if (config?.dailyLinearTeamId?.trim()) {
      items.push(navItem("daily"));
    }
    if (config?.workoutsLinearTeamId?.trim()) {
      items.push(navItem("workouts"));
    }
    return items;
  }
  return FULL_MODE_PRIMARY_ITEMS;
}

const FULL_MODE_SIDEBAR_SECTIONS: SidebarNavSectionDefinition[] = [
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

export function getSidebarSections(
  config?: LinearSidebarTeamConfig,
): SidebarNavSectionDefinition[] {
  if (isLinearProductMode()) {
    const workspaceItems: SidebarNavItemDefinition[] = [
      projectsNavItem(),
      navItem("meetings"),
    ];
    if (config?.knowledgeBaseLinearTeamId?.trim()) {
      workspaceItems.push(navItem("knowledge-base"));
    }
    if (config?.lettersLinearTeamId?.trim()) {
      workspaceItems.push(navItem("letters"));
    }
    const peopleItems: SidebarNavItemDefinition[] = [navItem("organizations")];
    if (config?.addressbookLinearTeamId?.trim()) {
      peopleItems.push(navItem("contacts"));
    }
    return [
      {
        id: "workspace",
        label: "Workspace",
        items: workspaceItems,
      },
      {
        id: "people",
        label: "People",
        items: peopleItems,
      },
    ];
  }
  return FULL_MODE_SIDEBAR_SECTIONS;
}

export function buildSidebarNavOrder(config?: LinearSidebarTeamConfig): SidebarNavItemId[] {
  return [
    ...getSidebarPrimaryItems(config),
    ...getSidebarSections(config).flatMap((section) => section.items),
  ].map((item) => item.id);
}

export function isSidebarPrimaryNavItem(id: SidebarNavItemId): boolean {
  return id === "inbox" || id === "daily" || id === "workouts";
}

/** Primary nav sections that show the content empty state until the user picks an item. */
export function shouldShowPrimaryNavEmptyState(id: SidebarNavItemId): boolean {
  if (id === "workouts") return false;
  if (id === "meetings") return false;
  if (id === "knowledge-base") return false;
  if (id === "contacts") return true;
  if (id === "organizations") return true;
  return isSidebarPrimaryNavItem(id) && id !== "daily";
}

/** @deprecated Prefer getSidebarSections(config) for linear letters team gating. */
export const SIDEBAR_SECTIONS: SidebarNavSectionDefinition[] = isLinearProductMode()
  ? getSidebarSections()
  : FULL_MODE_SIDEBAR_SECTIONS;

export const SIDEBAR_VAULT_NAV_ITEM_IDS = VAULT_NAV_ITEMS.map((item) => item.id);
