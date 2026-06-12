import { APP_VIEWS, type AppView } from "./appViews";
import { sidebarNavItemLabel, type SidebarNavItemId } from "../lib/sidebarNavItems";
import { SETTINGS_TABS, type SettingsTabId } from "../settings/settingsTabs";
import {
  mergeContentPanelBreadcrumbs,
  type ActiveLinearDocument,
  type ActiveLinearIssue,
  type ActiveVaultDocument,
  type ContentPanelBreadcrumbSegment,
} from "./contentPanelNavigation";
import type { LinearWorkspaceSelection } from "./linearWorkspaceSelection";
import { linearWorkspaceSelectionId } from "./linearWorkspaceSelection";
import {
  linearWorkspaceViewLabel,
  type LinearWorkspaceViewId,
} from "./linearProjectViews";

export function buildContentPanelBreadcrumbSegments(options: {
  settingsOpen: boolean;
  activeSettingsTab: SettingsTabId;
  activeVaultNavItem: SidebarNavItemId | null;
  activeView: AppView;
  activeSessionTitle?: string | null;
  sidebarSegments: ContentPanelBreadcrumbSegment[];
  linearSelection?: LinearWorkspaceSelection | null;
  activeVaultDocument?: ActiveVaultDocument | null;
  activeLinearDocument?: ActiveLinearDocument | null;
  activeLinearIssue?: ActiveLinearIssue | null;
  onClearActiveVaultDocument?: () => void;
  onClearActiveLinearDocument?: () => void;
  onClearActiveLinearIssue?: () => void;
  linearWorkspaceView?: LinearWorkspaceViewId | null;
}): ContentPanelBreadcrumbSegment[] {
  const {
    settingsOpen,
    activeSettingsTab,
    activeVaultNavItem,
    activeView,
    activeSessionTitle,
    sidebarSegments,
    linearSelection,
    activeVaultDocument,
    activeLinearDocument,
    activeLinearIssue,
    onClearActiveVaultDocument,
    onClearActiveLinearDocument,
    onClearActiveLinearIssue,
    linearWorkspaceView,
  } = options;

  if (settingsOpen) {
    const settingsTab = SETTINGS_TABS.find((tab) => tab.id === activeSettingsTab);
    return mergeContentPanelBreadcrumbs(
      [{ id: "settings", label: "Settings" }],
      settingsTab ? [{ id: `settings-${settingsTab.id}`, label: settingsTab.label }] : [],
    );
  }

  const rootSegments: ContentPanelBreadcrumbSegment[] = activeVaultNavItem
    ? activeVaultNavItem === "projects"
      ? [{ id: "nav-projects", label: "Linear", kind: "linear-logo" }]
      : [{ id: `nav-${activeVaultNavItem}`, label: sidebarNavItemLabel(activeVaultNavItem) }]
    : [{ id: "explorer", label: "Explorer" }];

  const viewDefinition = APP_VIEWS.find((view) => view.id === activeView);
  const contentSegments: ContentPanelBreadcrumbSegment[] = [];

  if (linearSelection) {
    const clearFocus = activeLinearDocument
      ? onClearActiveLinearDocument
      : activeVaultDocument
        ? onClearActiveVaultDocument
        : activeLinearIssue
          ? onClearActiveLinearIssue
          : undefined;

    contentSegments.push({
      id: linearWorkspaceSelectionId(linearSelection),
      label: linearSelection.name,
      ...(clearFocus ? { onActivate: clearFocus } : {}),
    });

    if (linearWorkspaceView && linearWorkspaceView !== "overview") {
      contentSegments.push({
        id: `linear-tab-${linearSelection.kind}-${linearWorkspaceView}`,
        label: linearWorkspaceViewLabel(linearSelection.kind, linearWorkspaceView),
        ...(clearFocus ? { onActivate: clearFocus } : {}),
      });
    }
  } else if (
    activeVaultNavItem !== "projects" &&
    viewDefinition &&
    (activeView === "chat" || activeView === "lookup")
  ) {
    contentSegments.push({ id: `view-${activeView}`, label: viewDefinition.label });
    const trimmedTitle = activeSessionTitle?.trim();
    if (trimmedTitle) {
      contentSegments.push({
        id: `session-${activeView}-${trimmedTitle}`,
        label: trimmedTitle,
      });
    }
  } else if (viewDefinition && !activeVaultNavItem) {
    contentSegments.push({ id: `view-${activeView}`, label: viewDefinition.label });
  }

  if (activeLinearDocument) {
    contentSegments.push({
      id: `linear-doc-${activeLinearDocument.id}`,
      label: activeLinearDocument.title,
    });
  }

  if (activeVaultDocument) {
    contentSegments.push({
      id: `vault-doc-${activeVaultDocument.path}`,
      label: activeVaultDocument.title,
    });
  }

  if (activeLinearIssue) {
    contentSegments.push({
      id: `linear-issue-${activeLinearIssue.id}`,
      label: `${activeLinearIssue.identifier} ${activeLinearIssue.title}`,
    });
  }

  return mergeContentPanelBreadcrumbs(rootSegments, sidebarSegments, contentSegments);
}
