import { Fragment, type DragEvent, type ReactNode } from "react";
import type { GroupVariant } from "../../lib/groupVariantFromStatusKey";
import type { StatusMoveDropIndicator, StatusMoveTargetGroup } from "../../lib/linearIssueStatusMove";
import { VirtualList } from "../../ui/VirtualList";
import { CollapsibleStatusSection } from "./CollapsibleStatusSection";

export interface StatusListGroup<T> {
  key: string;
  title: ReactNode;
  count: number;
  items: T[];
  variant?: GroupVariant;
  icon?: ReactNode;
  headerAction?: ReactNode;
  dropTarget?: StatusMoveTargetGroup;
}

export type StatusListDragDrop<T extends { id: string }> = {
  draggingIssueId: string | null;
  dropIndicator: StatusMoveDropIndicator | null;
  onPointerDragStart: (item: T, event: React.MouseEvent<HTMLElement>) => void;
  onGroupDragOver: (group: StatusMoveTargetGroup, event: DragEvent<HTMLElement>) => void;
  onGroupDrop: (group: StatusMoveTargetGroup, event: DragEvent<HTMLElement>) => void;
  onGroupMouseEnter: (group: StatusMoveTargetGroup) => void;
  onGroupMouseUp: (group: StatusMoveTargetGroup) => void;
};

/** Reusable status-grouped list shell — issue rows, document rows, etc. */
export function StatusGroupedList<T extends { id: string }>({
  groups,
  collapsedGroups,
  onToggleGroup,
  renderItem,
  idPrefix = "status-group",
  className,
  listClassName,
  dragDrop,
  virtualizeItemThreshold = 40,
}: {
  groups: StatusListGroup<T>[];
  collapsedGroups: Set<string>;
  onToggleGroup: (key: string) => void;
  renderItem: (item: T, groupKey: string) => ReactNode;
  idPrefix?: string;
  className?: string;
  listClassName?: string;
  dragDrop?: StatusListDragDrop<T>;
  virtualizeItemThreshold?: number;
}) {
  return (
    <div
      className={className ?? "workspace-status-list"}
      data-workspace-list-container
    >
      <ul className={listClassName ?? "workspace-status-list__list"} role="list">
        {groups.map((group) => {
          const dropTarget = group.dropTarget;
          const isDropTarget =
            Boolean(
              dragDrop &&
                dropTarget?.stateId &&
                dragDrop.dropIndicator?.stateId === dropTarget.stateId,
            );

          return (
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
              dropTarget={dropTarget}
              isDropTarget={isDropTarget}
              onGroupDragOver={
                dragDrop && dropTarget
                  ? (event) => dragDrop.onGroupDragOver(dropTarget, event)
                  : undefined
              }
              onGroupDrop={
                dragDrop && dropTarget
                  ? (event) => {
                      void dragDrop.onGroupDrop(dropTarget, event);
                    }
                  : undefined
              }
              onGroupMouseEnter={
                dragDrop && dropTarget
                  ? () => dragDrop.onGroupMouseEnter(dropTarget)
                  : undefined
              }
              onGroupMouseUp={
                dragDrop && dropTarget ? () => dragDrop.onGroupMouseUp(dropTarget) : undefined
              }
            >
              {group.items.length >= virtualizeItemThreshold && !dragDrop ? (
                <VirtualList
                  items={group.items}
                  estimateSize={52}
                  overscan={8}
                  getItemKey={(item) => item.id}
                  renderItem={(item) => renderItem(item, group.key)}
                />
              ) : (
                group.items.map((item) => {
                const showDividerBefore =
                  dragDrop &&
                  dropTarget?.stateId &&
                  dragDrop.dropIndicator?.stateId === dropTarget.stateId &&
                  dragDrop.dropIndicator.beforeIssueId === item.id;

                return (
                  <Fragment key={item.id}>
                    {showDividerBefore ? (
                      <li className="workspace-status-list-drop-divider" aria-hidden="true" />
                    ) : null}
                    {renderItem(item, group.key)}
                  </Fragment>
                );
              })
              )}
              {dragDrop &&
              dropTarget?.stateId &&
              dragDrop.dropIndicator?.stateId === dropTarget.stateId &&
              dragDrop.dropIndicator.beforeIssueId === null ? (
                <li className="workspace-status-list-drop-divider" aria-hidden="true" />
              ) : null}
            </CollapsibleStatusSection>
          );
        })}
      </ul>
    </div>
  );
}
