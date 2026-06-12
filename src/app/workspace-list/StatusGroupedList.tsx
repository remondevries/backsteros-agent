import type { ReactNode } from "react";
import type { GroupVariant } from "../../lib/groupVariantFromStatusKey";
import { CollapsibleStatusSection } from "./CollapsibleStatusSection";

export interface StatusListGroup<T> {
  key: string;
  title: ReactNode;
  count: number;
  items: T[];
  variant?: GroupVariant;
  icon?: ReactNode;
  headerAction?: ReactNode;
}

/** Reusable status-grouped list shell — issue rows, document rows, etc. */
export function StatusGroupedList<T>({
  groups,
  collapsedGroups,
  onToggleGroup,
  renderItem,
  idPrefix = "status-group",
  className,
  listClassName,
}: {
  groups: StatusListGroup<T>[];
  collapsedGroups: Set<string>;
  onToggleGroup: (key: string) => void;
  renderItem: (item: T, groupKey: string) => ReactNode;
  idPrefix?: string;
  className?: string;
  listClassName?: string;
}) {
  return (
    <div
      className={className ?? "workspace-status-list"}
      data-workspace-list-container
    >
      <ul className={listClassName ?? "workspace-status-list__list"} role="list">
        {groups.map((group) => (
          <CollapsibleStatusSection
            key={group.key}
            groupKey={group.key}
            title={group.title}
            count={group.count}
            icon={group.icon}
            headerAction={group.headerAction}
            variant={group.variant ?? "default"}
            collapsed={collapsedGroups.has(group.key)}
            onToggle={() => onToggleGroup(group.key)}
            idPrefix={idPrefix}
          >
            {group.items.map((item) => renderItem(item, group.key))}
          </CollapsibleStatusSection>
        ))}
      </ul>
    </div>
  );
}
