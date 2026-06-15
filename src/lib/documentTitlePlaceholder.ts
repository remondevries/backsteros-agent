import type { SidebarNavItemId } from "./sidebarNavItems";
import { isVaultSidebarNavItem, sidebarNavItemLabel } from "./sidebarNavItems";

export type DocumentPlaceholderOptions = {
  activeVaultNavItem?: SidebarNavItemId | null;
  dailyJournalSection?: boolean;
  meetingsSection?: boolean;
  lettersSection?: boolean;
};

function documentSectionLabel(options: DocumentPlaceholderOptions): string | null {
  if (options.lettersSection) return "letter";
  if (options.meetingsSection) return "meeting";
  if (options.dailyJournalSection) return "daily note";

  const navItem = options.activeVaultNavItem;
  if (navItem && isVaultSidebarNavItem(navItem)) {
    return sidebarNavItemLabel(navItem).toLowerCase();
  }

  return null;
}

export function documentTitlePlaceholder(options: DocumentPlaceholderOptions): string {
  const section = documentSectionLabel(options);
  if (section === "letter") return "Type here your letter title";
  if (section === "meeting") return "Type here your meeting title";
  if (section === "daily note") return "Type here your daily note title";
  if (section) return `Type here your ${section} title`;

  return "Type here your document title";
}

export function documentBodyPlaceholder(options: DocumentPlaceholderOptions): string {
  const section = documentSectionLabel(options);
  if (section === "letter") return "Type here the issue description";
  if (section === "meeting") return "Type here your meeting description";
  if (section === "daily note") return "Type here your daily note description";
  if (section) return `Type here your ${section} description`;

  return "Type here your description";
}
