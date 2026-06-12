import type { ReactNode } from "react";
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

export type SidebarNavItemId =
  | "inbox"
  | "daily"
  | "workouts"
  | "meetings"
  | "projects"
  | "financials"
  | "knowledge-base"
  | "letters"
  | "organizations"
  | "contacts";

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

export const SIDEBAR_PRIMARY_ITEMS: SidebarNavItemDefinition[] = [
  { id: "inbox", label: "Inbox", icon: <SidebarInboxIcon /> },
  { id: "daily", label: "Daily", icon: <SidebarDailyIcon /> },
  { id: "workouts", label: "Workouts", icon: <SidebarWorkoutsIcon /> },
];

export const SIDEBAR_SECTIONS: SidebarNavSectionDefinition[] = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { id: "meetings", label: "Meetings", icon: <SidebarMeetingsIcon /> },
      { id: "projects", label: "Projects", icon: <SidebarProjectsIcon /> },
      { id: "financials", label: "Financials", icon: <SidebarFinancialsIcon /> },
      { id: "knowledge-base", label: "Knowledge Base", icon: <SidebarKnowledgeBaseIcon /> },
      { id: "letters", label: "Letters", icon: <SidebarLettersIcon /> },
    ],
  },
  {
    id: "people",
    label: "People",
    items: [
      { id: "organizations", label: "Organizations", icon: <SidebarOrganizationsIcon /> },
      { id: "contacts", label: "Contacts", icon: <SidebarContactsIcon /> },
    ],
  },
];
