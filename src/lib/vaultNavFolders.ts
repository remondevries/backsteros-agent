export const VAULT_NAV_FOLDER_NAMES = [
  "Inbox",
  "Daily",
  "Workouts",
  "Meetings",
  "Financials",
  "Knowledge Base",
  "Letters",
  "Organizations",
  "Contacts",
] as const;

export type VaultNavFolderName = (typeof VAULT_NAV_FOLDER_NAMES)[number];

export type VaultNavItemId =
  | "inbox"
  | "daily"
  | "workouts"
  | "meetings"
  | "financials"
  | "knowledge-base"
  | "letters"
  | "organizations"
  | "contacts";

export interface VaultNavItemDefinition {
  id: VaultNavItemId;
  label: VaultNavFolderName;
}

export const VAULT_NAV_ITEMS: VaultNavItemDefinition[] = [
  { id: "inbox", label: "Inbox" },
  { id: "daily", label: "Daily" },
  { id: "workouts", label: "Workouts" },
  { id: "meetings", label: "Meetings" },
  { id: "financials", label: "Financials" },
  { id: "knowledge-base", label: "Knowledge Base" },
  { id: "letters", label: "Letters" },
  { id: "organizations", label: "Organizations" },
  { id: "contacts", label: "Contacts" },
];

const VAULT_NAV_ITEM_IDS = new Set<VaultNavItemId>(VAULT_NAV_ITEMS.map((item) => item.id));

export const VAULT_NAV_ITEM_TO_FOLDER = Object.fromEntries(
  VAULT_NAV_ITEMS.map((item) => [item.id, item.label]),
) as Record<VaultNavItemId, VaultNavFolderName>;

export function isVaultNavItemId(value: string): value is VaultNavItemId {
  return VAULT_NAV_ITEM_IDS.has(value as VaultNavItemId);
}

export function vaultFolderForNavItem(id: VaultNavItemId): VaultNavFolderName {
  return VAULT_NAV_ITEM_TO_FOLDER[id];
}

export function vaultNavItemLabel(id: VaultNavItemId): VaultNavFolderName {
  return vaultFolderForNavItem(id);
}

export function isVaultNavFolderName(name: string): name is VaultNavFolderName {
  return (VAULT_NAV_FOLDER_NAMES as readonly string[]).includes(name);
}
