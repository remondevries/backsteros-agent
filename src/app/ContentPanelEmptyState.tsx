import { sidebarNavItemLabel, type SidebarNavItemId } from "../lib/sidebarNavItems";

export function ContentPanelEmptyState({
  activeVaultNavItem,
}: {
  activeVaultNavItem: SidebarNavItemId;
}) {
  const sectionLabel = sidebarNavItemLabel(activeVaultNavItem);

  return (
    <div className="content-panel-empty-state">
      <p className="content-panel-empty-state-title">{sectionLabel}</p>
      <p className="content-panel-empty-state-body">
        Select an item from the sidebar to open it here.
      </p>
    </div>
  );
}
