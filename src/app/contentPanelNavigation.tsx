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

export type ActiveLinearIssue = {
  id: string;
  identifier: string;
  title: string;
};

export type ActiveLinearDocument = {
  id: string;
  title: string;
  projectId?: string;
};

export type FocusContentSnapshot =
  | {
      kind: "linear_issue";
      description: string | null;
    }
  | {
      kind: "linear_document";
      title: string;
      content: string;
    }
  | {
      kind: "vault_document";
      title: string;
      body: string;
    }
  | {
      kind: "linear_workspace";
      summary: string | null;
      description: string | null;
    };

export type ContentPanelBarState = {
  message: string | null;
  tone: "default" | "error";
  refreshing: boolean;
  onRefresh: (() => void) | null;
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
  activeLinearDocument: ActiveLinearDocument | null;
  setActiveLinearDocument: (document: ActiveLinearDocument | null) => void;
  updateActiveLinearDocument: (patch: Partial<ActiveLinearDocument>) => void;
  clearActiveLinearDocument: () => void;
  activeLinearIssue: ActiveLinearIssue | null;
  setActiveLinearIssue: (issue: ActiveLinearIssue | null) => void;
  updateActiveLinearIssue: (patch: Partial<ActiveLinearIssue>) => void;
  clearActiveLinearIssue: () => void;
  focusContentSnapshot: FocusContentSnapshot | null;
  setFocusContentSnapshot: (
    snapshot:
      | FocusContentSnapshot
      | null
      | ((current: FocusContentSnapshot | null) => FocusContentSnapshot | null),
  ) => void;
  linearWorkspaceView: LinearWorkspaceViewId | null;
  setLinearWorkspaceView: (view: LinearWorkspaceViewId | null) => void;
  contentPanelBarState: ContentPanelBarState | null;
  setContentPanelBarState: (state: ContentPanelBarState | null) => void;
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
  const [activeLinearIssue, setActiveLinearIssueState] = useState<ActiveLinearIssue | null>(null);
  const [activeLinearDocument, setActiveLinearDocumentState] = useState<ActiveLinearDocument | null>(
    null,
  );
  const [focusContentSnapshot, setFocusContentSnapshotState] = useState<FocusContentSnapshot | null>(
    null,
  );
  const [linearWorkspaceView, setLinearWorkspaceViewState] = useState<LinearWorkspaceViewId | null>(
    null,
  );
  const [contentPanelBarState, setContentPanelBarStateState] = useState<ContentPanelBarState | null>(
    null,
  );

  const linearSelectionKey = linearSelection
    ? `${linearSelection.kind}:${linearSelection.id}`
    : null;

  useEffect(() => {
    setActiveVaultDocumentState(null);
    setActiveLinearDocumentState(null);
    setActiveLinearIssueState(null);
    setFocusContentSnapshotState(null);
    setLinearWorkspaceViewState(null);
    setContentPanelBarStateState(null);
  }, [linearSelectionKey]);

  const setSidebarSegments = useCallback((segments: ContentPanelBreadcrumbSegment[]) => {
    setSidebarSegmentsState(segments);
  }, []);

  const setLinearSelection = useCallback((selection: LinearWorkspaceSelection | null) => {
    setLinearSelectionState(selection);
  }, []);

  const setActiveVaultDocument = useCallback((document: ActiveVaultDocument | null) => {
    setActiveVaultDocumentState(document);
    if (document) {
      setActiveLinearIssueState(null);
      setActiveLinearDocumentState(null);
    }
  }, []);

  const updateActiveVaultDocument = useCallback((patch: Partial<ActiveVaultDocument>) => {
    setActiveVaultDocumentState((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const clearActiveVaultDocument = useCallback(() => {
    setActiveVaultDocumentState(null);
    setFocusContentSnapshotState((current) =>
      current?.kind === "vault_document" ? null : current,
    );
  }, []);

  const setActiveLinearDocument = useCallback((document: ActiveLinearDocument | null) => {
    setActiveLinearDocumentState(document);
    if (document) {
      setActiveLinearIssueState(null);
      setActiveVaultDocumentState(null);
    }
  }, []);

  const updateActiveLinearDocument = useCallback((patch: Partial<ActiveLinearDocument>) => {
    setActiveLinearDocumentState((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const clearActiveLinearDocument = useCallback(() => {
    setActiveLinearDocumentState(null);
    setFocusContentSnapshotState((current) =>
      current?.kind === "linear_document" ? null : current,
    );
  }, []);

  const setActiveLinearIssue = useCallback((issue: ActiveLinearIssue | null) => {
    setActiveLinearIssueState(issue);
    if (issue) {
      setActiveVaultDocumentState(null);
      setActiveLinearDocumentState(null);
    }
  }, []);

  const updateActiveLinearIssue = useCallback((patch: Partial<ActiveLinearIssue>) => {
    setActiveLinearIssueState((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const clearActiveLinearIssue = useCallback(() => {
    setActiveLinearIssueState(null);
    setFocusContentSnapshotState((current) => (current?.kind === "linear_issue" ? null : current));
  }, []);

  const setFocusContentSnapshot = useCallback(
    (
      snapshot:
        | FocusContentSnapshot
        | null
        | ((current: FocusContentSnapshot | null) => FocusContentSnapshot | null),
    ) => {
      setFocusContentSnapshotState(snapshot);
    },
    [],
  );

  const setLinearWorkspaceView = useCallback((view: LinearWorkspaceViewId | null) => {
    setLinearWorkspaceViewState(view);
  }, []);

  const setContentPanelBarState = useCallback((state: ContentPanelBarState | null) => {
    setContentPanelBarStateState(state);
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
      activeLinearDocument,
      setActiveLinearDocument,
      updateActiveLinearDocument,
      clearActiveLinearDocument,
      activeLinearIssue,
      setActiveLinearIssue,
      updateActiveLinearIssue,
      clearActiveLinearIssue,
      focusContentSnapshot,
      setFocusContentSnapshot,
      linearWorkspaceView,
      setLinearWorkspaceView,
      contentPanelBarState,
      setContentPanelBarState,
    }),
    [
      activeLinearDocument,
      activeLinearIssue,
      activeVaultDocument,
      clearActiveLinearDocument,
      clearActiveLinearIssue,
      clearActiveVaultDocument,
      contentPanelBarState,
      focusContentSnapshot,
      linearSelection,
      linearWorkspaceView,
      setActiveLinearDocument,
      setActiveLinearIssue,
      setActiveVaultDocument,
      setContentPanelBarState,
      setFocusContentSnapshot,
      setLinearSelection,
      setLinearWorkspaceView,
      sidebarSegments,
      setSidebarSegments,
      updateActiveLinearDocument,
      updateActiveLinearIssue,
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
