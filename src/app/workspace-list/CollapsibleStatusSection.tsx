import type { ReactNode } from "react";
import {
  groupVariantClassName,
  type GroupVariant,
} from "../../lib/groupVariantFromStatusKey";

function GroupChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`workspace-status-group__chevron${expanded ? " workspace-status-group__chevron--expanded" : ""}`}
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden="true"
    >
      <path
        d="M9 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
}) {
  const groupId = `${idPrefix}-${groupKey.replace(/\s+/g, "-").toLowerCase()}`;
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

  const chevronClass = [
    "workspace-status-group__chevron-slot",
    hasIcon ? "workspace-status-group__chevron-slot--swap" : null,
    !collapsed ? "workspace-status-group__chevron-slot--expanded" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <li
        className={groupClass}
        id={groupId}
        data-collapsed={collapsed ? "true" : "false"}
        data-workspace-list-group-key={groupKey}
      >
        <button
          type="button"
          className="workspace-status-group__header"
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
      </li>
      {!collapsed ? children : null}
    </>
  );
}
