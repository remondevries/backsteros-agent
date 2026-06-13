import { VAULT_NAV_ITEMS, vaultNavItemLabel, type VaultNavItemId } from "../lib/vaultNavFolders";

const FOLDER_TO_NAV_ITEM = Object.fromEntries(
  VAULT_NAV_ITEMS.map((item) => [vaultNavItemLabel(item.id), item.id]),
) as Record<string, VaultNavItemId>;

export function vaultNavItemIdFromPath(path: string): VaultNavItemId | null {
  const folder = path.split("/")[0]?.trim();
  if (!folder) return null;
  return FOLDER_TO_NAV_ITEM[folder] ?? null;
}
