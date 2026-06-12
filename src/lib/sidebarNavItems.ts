import { isVaultNavItemId, vaultNavItemLabel, type VaultNavItemId } from "./vaultNavFolders";

export type SidebarNavItemId = VaultNavItemId | "projects";

export function isSidebarNavItemId(value: string): value is SidebarNavItemId {
  return value === "projects" || isVaultNavItemId(value);
}

export function isVaultSidebarNavItem(id: SidebarNavItemId): id is VaultNavItemId {
  return isVaultNavItemId(id);
}

export function sidebarNavItemLabel(id: SidebarNavItemId): string {
  if (id === "projects") return "Projects";
  return vaultNavItemLabel(id);
}
