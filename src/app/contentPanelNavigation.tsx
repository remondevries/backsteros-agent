import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LinearWorkspaceSelection } from "./linearWorkspaceSelection";

export type ContentPanelBreadcrumbSegment = {
  id: string;
  label: string;
  onActivate?: () => void;
};

type ContentPanelNavigationContextValue = {
  sidebarSegments: ContentPanelBreadcrumbSegment[];
  setSidebarSegments: (segments: ContentPanelBreadcrumbSegment[]) => void;
  linearSelection: LinearWorkspaceSelection | null;
  setLinearSelection: (selection: LinearWorkspaceSelection | null) => void;
};

const ContentPanelNavigationContext = createContext<ContentPanelNavigationContextValue | null>(
  null,
);

export function ContentPanelNavigationProvider({
  children,
  projectsNavActive,
}: {
  children: ReactNode;
  projectsNavActive: boolean;
}) {
  const [sidebarSegments, setSidebarSegmentsState] = useState<ContentPanelBreadcrumbSegment[]>(
    [],
  );
  const [linearSelection, setLinearSelectionState] = useState<LinearWorkspaceSelection | null>(
    null,
  );

  const setSidebarSegments = useCallback((segments: ContentPanelBreadcrumbSegment[]) => {
    setSidebarSegmentsState(segments);
  }, []);

  const setLinearSelection = useCallback((selection: LinearWorkspaceSelection | null) => {
    setLinearSelectionState(selection);
  }, []);

  useEffect(() => {
    if (!projectsNavActive) {
      setLinearSelectionState(null);
    }
  }, [projectsNavActive]);

  const value = useMemo(
    () => ({
      sidebarSegments,
      setSidebarSegments,
      linearSelection,
      setLinearSelection,
    }),
    [linearSelection, setLinearSelection, sidebarSegments, setSidebarSegments],
  );

  return (
    <ContentPanelNavigationContext.Provider value={value}>
      {children}
    </ContentPanelNavigationContext.Provider>
  );
}

export function useContentPanelNavigation() {
  const context = useContext(ContentPanelNavigationContext);
  if (!context) {
    throw new Error("useContentPanelNavigation must be used within ContentPanelNavigationProvider");
  }
  return context;
}

export function useContentPanelSidebarBreadcrumbs(
  segments: ContentPanelBreadcrumbSegment[],
  enabled = true,
) {
  const { setSidebarSegments } = useContentPanelNavigation();

  useEffect(() => {
    if (!enabled) {
      setSidebarSegments([]);
      return;
    }
    setSidebarSegments(segments);
    return () => setSidebarSegments([]);
  }, [enabled, segments, setSidebarSegments]);
}

export function mergeContentPanelBreadcrumbs(
  ...groups: ContentPanelBreadcrumbSegment[][]
): ContentPanelBreadcrumbSegment[] {
  const merged: ContentPanelBreadcrumbSegment[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    for (const segment of group) {
      if (seen.has(segment.id)) continue;
      seen.add(segment.id);
      merged.push(segment);
    }
  }

  return merged;
}
