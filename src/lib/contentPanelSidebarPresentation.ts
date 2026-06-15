export type ContentPanelSidebarPresentation =
  | "hidden"
  | "desktop-resizable"
  | "narrow-done"
  | "ios-overlay"
  | "ios-inline";

export function resolveContentPanelSidebarPresentation({
  hideSidebar,
  narrowContentLayout,
  iosListNavEnabled,
  hasDetailView,
  narrowContentSidebar,
  iosProjectsTableLayout,
}: {
  hideSidebar: boolean;
  narrowContentLayout: boolean;
  iosListNavEnabled: boolean;
  hasDetailView: boolean;
  narrowContentSidebar: boolean;
  iosProjectsTableLayout: boolean;
}): ContentPanelSidebarPresentation {
  if (hideSidebar) {
    return "hidden";
  }

  if (iosListNavEnabled) {
    if (iosProjectsTableLayout && !hasDetailView) {
      return "hidden";
    }
    return hasDetailView ? "ios-overlay" : "ios-inline";
  }

  if (narrowContentLayout) {
    return narrowContentSidebar ? "narrow-done" : "hidden";
  }

  return "desktop-resizable";
}

export function shouldShowContentPanelMainSlot({
  presentation,
}: {
  presentation: ContentPanelSidebarPresentation;
}): boolean {
  return presentation !== "ios-inline" && presentation !== "narrow-done";
}

export function shouldMountIosSidebarOverlay({
  iosListNavEnabled,
  hasDetailView,
}: {
  iosListNavEnabled: boolean;
  hasDetailView: boolean;
}): boolean {
  return iosListNavEnabled && hasDetailView;
}
