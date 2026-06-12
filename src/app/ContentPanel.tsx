import type { ReactNode } from "react";
import { ContentPanelSidebar } from "./ContentPanelSidebar";
import { ResizablePanel } from "./ResizablePanel";

const CONTENT_PANEL_SIDEBAR_WIDTH_KEY = "backsteros.layout.contentPanelWidth";

export function ContentPanel({
  sidebarOpen,
  hideSidebar = false,
  children,
}: {
  sidebarOpen: boolean;
  hideSidebar?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="content-panel">
      {!hideSidebar ? (
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
          <ContentPanelSidebar />
        </ResizablePanel>
      ) : null}
      <div className="content-panel-content">{children}</div>
    </div>
  );
}
