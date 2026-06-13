import type { ContentListNavItem } from "./contentListNavigation";

export function buildStatusGroupedNavItems<T extends { id: string }>({
  groups,
  collapsedGroups,
  onSelect,
  getItemId = (item) => item.id,
}: {
  groups: Array<{ key: string; items: T[] }>;
  collapsedGroups: Set<string>;
  onSelect: (item: T) => void;
  getItemId?: (item: T) => string;
}): ContentListNavItem[] {
  const items: ContentListNavItem[] = [];

  for (const group of groups) {
    if (collapsedGroups.has(group.key)) continue;
    for (const item of group.items) {
      items.push({
        id: getItemId(item),
        select: () => onSelect(item),
      });
    }
  }

  return items;
}
