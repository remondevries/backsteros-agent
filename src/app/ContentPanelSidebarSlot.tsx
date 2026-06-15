import type { ComponentProps } from "react";
import { ContentPanelSidebar } from "./ContentPanelSidebar";
import { ResizablePanel } from "./ResizablePanel";
import type { ContentPanelSidebarPresentation } from "../lib/contentPanelSidebarPresentation";
import { isIosDevice } from "../platform/iosStandalone";

const CONTENT_PANEL_SIDEBAR_WIDTH_KEY = "backsteros.layout.contentPanelWidth";

type SidebarProps = ComponentProps<typeof ContentPanelSidebar>;

export function ContentPanelSidebarSlot({
  presentation,
  sidebarProps,
  sidebarOpen,
  onCloseNarrow,
}: {
  presentation: ContentPanelSidebarPresentation;
  sidebarProps: SidebarProps;
  sidebarOpen: boolean;
  onCloseNarrow: () => void;
}) {
  switch (presentation) {
    case "ios-overlay":
      return <ContentPanelSidebar {...sidebarProps} iosOverlay />;
    case "ios-inline":
      return (
        <div className="content-panel-content content-panel-content--ios-list-inline">
          <ContentPanelSidebar {...sidebarProps} />
        </div>
      );
    case "narrow-done":
      return (
        <div className="content-panel-narrow-sidebar">
          {!isIosDevice() ? (
            <div className="content-panel-narrow-sidebar-header">
              <button
                type="button"
                className="content-panel-narrow-sidebar-done"
                onClick={onCloseNarrow}
              >
                Done
              </button>
            </div>
          ) : null}
          <ContentPanelSidebar {...sidebarProps} />
        </div>
      );
    case "desktop-resizable":
      return (
        <ResizablePanel
          side="left"
          className="app-resizable-panel-inset"
          storageKey={CONTENT_PANEL_SIDEBAR_WIDTH_KEY}
          defaultWidth={240}
          minWidth={180}
          maxWidth={400}
          ariaLabel="Content panel sidebar"
          collapsed={!sidebarOpen}
        >
          <ContentPanelSidebar {...sidebarProps} />
        </ResizablePanel>
      );
    case "hidden":
    default:
      return null;
  }
}
