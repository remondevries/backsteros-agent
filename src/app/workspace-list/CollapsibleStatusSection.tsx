import type { DragEvent, ReactNode } from "react";
import {
  groupVariantClassName,
  type GroupVariant,
} from "../../lib/groupVariantFromStatusKey";
import type { StatusMoveTargetGroup } from "../../lib/linearIssueStatusMove";
import {
  contentListGroupHeaderId,
  contentListItemDataAttributes,
} from "../../lib/contentListNavigation";
import {
  isContentListKeyboardFocused,
  useContentListKeyboardFocusedId,
} from "../../lib/contentListNavigationReact";
import { GroupChevron } from "./GroupChevron";

export function CollapsibleStatusSection({
  groupKey,
  collapsed,
  onToggle,
  title,
  icon,
  count,
  headerAction,
  variant = "default",
  idPrefix = "status-group",
  children,
  isDropTarget = false,
  onGroupDragOver,
  onGroupDrop,
  onGroupMouseEnter,
  onGroupMouseUp,
}: {
  groupKey: string;
  collapsed: boolean;
  onToggle: () => void;
  title: ReactNode;
  icon?: ReactNode;
  count?: number;
  headerAction?: ReactNode;
  variant?: GroupVariant;
  idPrefix?: string;
  children: ReactNode;
  dropTarget?: StatusMoveTargetGroup;
  isDropTarget?: boolean;
  onGroupDragOver?: (event: DragEvent<HTMLElement>) => void;
  onGroupDrop?: (event: DragEvent<HTMLElement>) => void;
  onGroupMouseEnter?: () => void;
  onGroupMouseUp?: () => void;
}) {
  const keyboardFocusedId = useContentListKeyboardFocusedId();
  const headerListId = contentListGroupHeaderId(idPrefix, groupKey);
  const groupId = `${idPrefix}-${groupKey.replace(/\s+/g, "-").toLowerCase()}`;
  const keyboardFocused = isContentListKeyboardFocused(keyboardFocusedId, headerListId);
  const hasIcon = icon != null;
  const hasHeaderAction = headerAction != null;

  const groupClass = [
    "workspace-status-group",
    groupVariantClassName(variant),
    "workspace-status-group--sticky",
    hasHeaderAction ? "workspace-status-group--has-action" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const headerClass = [
    "workspace-status-group__header",
    isDropTarget ? "workspace-status-group__header--drop-target" : null,
    keyboardFocused ? "workspace-status-group__header--keyboard-focused" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const chevronClass = [
    "workspace-status-group__chevron-slot",
    hasIcon ? "workspace-status-group__chevron-slot--swap" : null,
    !collapsed ? "workspace-status-group__chevron-slot--expanded" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li
      className={groupClass}
      id={groupId}
      data-collapsed={collapsed ? "true" : "false"}
      data-workspace-list-group-key={groupKey}
      onDragOver={onGroupDragOver}
      onDrop={onGroupDrop}
      onMouseEnter={onGroupMouseEnter}
      onMouseUp={onGroupMouseUp}
    >
      <button
        type="button"
        {...contentListItemDataAttributes(headerListId)}
        className={headerClass}
        onClick={onToggle}
        aria-expanded={!collapsed}
      >
        <span className={chevronClass}>
          {hasIcon ? <span className="workspace-status-group__icon">{icon}</span> : null}
          <GroupChevron expanded={!collapsed} />
        </span>
        <span className="workspace-status-group__title">{title}</span>
        {!hasHeaderAction && count != null ? (
          <span className="workspace-status-group__count">{count}</span>
        ) : null}
      </button>
      {hasHeaderAction ? (
        <div className="workspace-status-group__detail">
          {count != null ? <span className="workspace-status-group__count">{count}</span> : null}
          <div className="workspace-status-group__action">{headerAction}</div>
        </div>
      ) : null}
      {!collapsed ? (
        <ul
          className="workspace-status-group__items"
          onDragOver={onGroupDragOver}
          onDrop={onGroupDrop}
          onMouseEnter={onGroupMouseEnter}
          onMouseUp={onGroupMouseUp}
        >
          {children}
        </ul>
      ) : isDropTarget ? (
        <div className="workspace-status-group__collapsed-drop" aria-hidden="true">
          <span className="workspace-status-list-drop-divider" />
        </div>
      ) : null}
    </li>
  );
}
