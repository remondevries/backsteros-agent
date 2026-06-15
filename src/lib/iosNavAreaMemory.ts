import type { ContentPanelTabSnapshot } from "../app/contentPanelNavigation";
import type { SidebarNavItemId } from "./sidebarNavItems";

const STORAGE_KEY = "backsteros.iosNavAreaMemory";

type MemoryStore = Partial<Record<SidebarNavItemId, ContentPanelTabSnapshot>>;

let navAreaRestoreDepth = 0;

function readStore(): MemoryStore {
  if (typeof sessionStorage === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as MemoryStore;
  } catch {
    return {};
  }
}

function writeStore(store: MemoryStore): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function saveIosNavAreaSnapshot(
  navItem: SidebarNavItemId,
  snapshot: ContentPanelTabSnapshot,
): void {
  const store = readStore();
  store[navItem] = snapshot;
  writeStore(store);
}

export function readIosNavAreaSnapshot(
  navItem: SidebarNavItemId,
): ContentPanelTabSnapshot | null {
  return readStore()[navItem] ?? null;
}

export function clearIosNavAreaSnapshot(navItem: SidebarNavItemId): void {
  const store = readStore();
  delete store[navItem];
  writeStore(store);
}

export function beginIosNavAreaRestore(): void {
  navAreaRestoreDepth += 1;
}

export function endIosNavAreaRestore(): void {
  navAreaRestoreDepth = Math.max(0, navAreaRestoreDepth - 1);
}

export function isIosNavAreaRestoring(): boolean {
  return navAreaRestoreDepth > 0;
}
