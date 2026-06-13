import { useCallback, useState } from "react";

const LEFT_SIDE_PANEL_OPEN_KEY = "backsteros.layout.leftPanelOpen";
const RIGHT_SIDE_PANEL_OPEN_KEY = "backsteros.layout.rightPanelOpen";
const CONTENT_PANEL_SIDEBAR_OPEN_KEY = "backsteros.layout.contentPanelOpen";

function readStoredToggle(storageKey: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) return fallback;
    return raw === "true";
  } catch {
    return fallback;
  }
}

function persistToggle(storageKey: string, open: boolean) {
  try {
    localStorage.setItem(storageKey, String(open));
  } catch {
    // Ignore storage failures.
  }
}

export function useSidePanelToggles() {
  const [leftSidePanelOpen, setLeftSidePanelOpen] = useState(() =>
    readStoredToggle(LEFT_SIDE_PANEL_OPEN_KEY, true),
  );
  const [rightSidePanelOpen, setRightSidePanelOpen] = useState(() =>
    readStoredToggle(RIGHT_SIDE_PANEL_OPEN_KEY, true),
  );
  const [contentPanelSidebarOpen, setContentPanelSidebarOpen] = useState(() =>
    readStoredToggle(CONTENT_PANEL_SIDEBAR_OPEN_KEY, true),
  );

  const toggleLeftSidePanel = useCallback(() => {
    setLeftSidePanelOpen((open) => {
      const next = !open;
      persistToggle(LEFT_SIDE_PANEL_OPEN_KEY, next);
      return next;
    });
  }, []);

  const toggleRightSidePanel = useCallback(() => {
    setRightSidePanelOpen((open) => {
      const next = !open;
      persistToggle(RIGHT_SIDE_PANEL_OPEN_KEY, next);
      return next;
    });
  }, []);

  const toggleContentPanelSidebar = useCallback(() => {
    setContentPanelSidebarOpen((open) => {
      const next = !open;
      persistToggle(CONTENT_PANEL_SIDEBAR_OPEN_KEY, next);
      return next;
    });
  }, []);

  const closeLeftSidePanel = useCallback(() => {
    setLeftSidePanelOpen(false);
    persistToggle(LEFT_SIDE_PANEL_OPEN_KEY, false);
  }, []);

  const closeRightSidePanel = useCallback(() => {
    setRightSidePanelOpen(false);
    persistToggle(RIGHT_SIDE_PANEL_OPEN_KEY, false);
  }, []);

  return {
    leftSidePanelOpen,
    rightSidePanelOpen,
    contentPanelSidebarOpen,
    toggleLeftSidePanel,
    toggleRightSidePanel,
    toggleContentPanelSidebar,
    closeLeftSidePanel,
    closeRightSidePanel,
  };
}
