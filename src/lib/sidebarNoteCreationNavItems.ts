import type { VaultNavItemId } from "./vaultNavFolders";

export const SIDEBAR_NOTE_CREATION_NAV_ITEMS = new Set<VaultNavItemId>([
  "inbox",
  "meetings",
  "knowledge-base",
  "letters",
  "contacts",
]);

export function supportsSidebarNoteCreation(navItem: VaultNavItemId): boolean {
  return SIDEBAR_NOTE_CREATION_NAV_ITEMS.has(navItem);
}
