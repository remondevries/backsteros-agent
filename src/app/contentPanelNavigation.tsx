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
import type { LinearWorkspaceViewId } from "./linearProjectViews";

export type ContentPanelBreadcrumbSegment = {
  id: string;
  label: string;
  kind?: "linear-logo";
  onActivate?: () => void;
};

export type ActiveVaultDocument = {
  path: string;
  title: string;
};

type ContentPanelNavigationContextValue = {
  sidebarSegments: ContentPanelBreadcrumbSegment[];
  setSidebarSegments: (segments: ContentPanelBreadcrumbSegment[]) => void;
  linearSelection: LinearWorkspaceSelection | null;
  setLinearSelection: (selection: LinearWorkspaceSelection | null) => void;
  activeVaultDocument: ActiveVaultDocument | null;
  setActiveVaultDocument: (document: ActiveVaultDocument | null) => void;
  updateActiveVaultDocument: (patch: Partial<ActiveVaultDocument>) => void;
  clearActiveVaultDocument: () => void;
  linearWorkspaceView: LinearWorkspaceViewId | null;
  setLinearWorkspaceView: (view: LinearWorkspaceViewId | null) => void;
};

const ContentPanelNavigationContext = createContext<ContentPanelNavigationContextValue | null>(
  null,
);

export function ContentPanelNavigationProvider({ children }: { children: ReactNode }) {
  const [sidebarSegments, setSidebarSegmentsState] = useState<ContentPanelBreadcrumbSegment[]>(
    [],
  );
  const [linearSelection, setLinearSelectionState] = useState<LinearWorkspaceSelection | null>(
    null,
  );
  const [activeVaultDocument, setActiveVaultDocumentState] = useState<ActiveVaultDocument | null>(
    null,
  );
  const [linearWorkspaceView, setLinearWorkspaceViewState] = useState<LinearWorkspaceViewId | null>(
    null,
  );

  const linearSelectionKey = linearSelection
    ? `${linearSelection.kind}:${linearSelection.id}`
    : null;

  useEffect(() => {
    setActiveVaultDocumentState(null);
    setLinearWorkspaceViewState(null);
  }, [linearSelectionKey]);

  const setSidebarSegments = useCallback((segments: ContentPanelBreadcrumbSegment[]) => {
    setSidebarSegmentsState(segments);
  }, []);

  const setLinearSelection = useCallback((selection: LinearWorkspaceSelection | null) => {
    setLinearSelectionState(selection);
  }, []);

  const setActiveVaultDocument = useCallback((document: ActiveVaultDocument | null) => {
    setActiveVaultDocumentState(document);
  }, []);

  const updateActiveVaultDocument = useCallback((patch: Partial<ActiveVaultDocument>) => {
    setActiveVaultDocumentState((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const clearActiveVaultDocument = useCallback(() => {
    setActiveVaultDocumentState(null);
  }, []);

  const setLinearWorkspaceView = useCallback((view: LinearWorkspaceViewId | null) => {
    setLinearWorkspaceViewState(view);
  }, []);

  const value = useMemo(
    () => ({
      sidebarSegments,
      setSidebarSegments,
      linearSelection,
      setLinearSelection,
      activeVaultDocument,
      setActiveVaultDocument,
      updateActiveVaultDocument,
      clearActiveVaultDocument,
      linearWorkspaceView,
      setLinearWorkspaceView,
    }),
    [
      activeVaultDocument,
      clearActiveVaultDocument,
      linearSelection,
      linearWorkspaceView,
      setActiveVaultDocument,
      setLinearSelection,
      setLinearWorkspaceView,
      sidebarSegments,
      setSidebarSegments,
      updateActiveVaultDocument,
    ],
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
