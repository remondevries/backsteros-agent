import type { ContentListNavItem } from "./contentListNavigation";
import { contentListGroupHeaderId } from "./contentListNavigation";

export function buildStatusGroupedNavItems<T extends { id: string }>({
  groups,
  collapsedGroups,
  onSelect,
  onToggleGroup,
  groupHeaderIdPrefix,
  getItemId = (item) => item.id,
}: {
  groups: Array<{ key: string; items: T[] }>;
  collapsedGroups: Set<string>;
  onSelect: (item: T) => void;
  onToggleGroup?: (groupKey: string) => void;
  groupHeaderIdPrefix?: string;
  getItemId?: (item: T) => string;
}): ContentListNavItem[] {
  const items: ContentListNavItem[] = [];

  for (const group of groups) {
    if (onToggleGroup && groupHeaderIdPrefix) {
      items.push({
        id: contentListGroupHeaderId(groupHeaderIdPrefix, group.key),
        select: () => onToggleGroup(group.key),
      });
    }
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
