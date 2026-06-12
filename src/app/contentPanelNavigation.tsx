import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ContentPanelBreadcrumbSegment = {
  id: string;
  label: string;
  onActivate?: () => void;
};

type ContentPanelNavigationContextValue = {
  sidebarSegments: ContentPanelBreadcrumbSegment[];
  setSidebarSegments: (segments: ContentPanelBreadcrumbSegment[]) => void;
};

const ContentPanelNavigationContext = createContext<ContentPanelNavigationContextValue | null>(
  null,
);

export function ContentPanelNavigationProvider({ children }: { children: ReactNode }) {
  const [sidebarSegments, setSidebarSegmentsState] = useState<ContentPanelBreadcrumbSegment[]>(
    [],
  );

  const setSidebarSegments = useCallback((segments: ContentPanelBreadcrumbSegment[]) => {
    setSidebarSegmentsState(segments);
  }, []);

  const value = useMemo(
    () => ({
      sidebarSegments,
      setSidebarSegments,
    }),
    [sidebarSegments, setSidebarSegments],
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
