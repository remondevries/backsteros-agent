import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import type { LinearWorkspaceSelection } from "./linearWorkspaceSelection";
import { isLinearWorkspaceViewIdForKind, type LinearWorkspaceViewId } from "./linearProjectViews";

export type LinearProjectCollectionMode = "list" | "board";
type PersistedContentPanelState = {
  linearSelection?: LinearWorkspaceSelection;
  activeLinearIssue?: ActiveLinearIssue;
  activeLinearDocument?: ActiveLinearDocument;
  linearWorkspaceView?: LinearWorkspaceViewId;
  issuesPanelMode?: LinearProjectCollectionMode;
  watchersPanelMode?: LinearProjectCollectionMode;
};

const CONTENT_PANEL_STATE_STORAGE_KEY = "backsteros.content-panel.state";

function parsePersistedLinearSelection(value: unknown): LinearWorkspaceSelection | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<LinearWorkspaceSelection>;
  const kind = candidate.kind;
  const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  if ((kind !== "team" && kind !== "project") || !id || !name) return undefined;
  return { kind, id, name };
}

function parsePersistedLinearIssue(value: unknown): ActiveLinearIssue | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<ActiveLinearIssue>;
  const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
  const identifier = typeof candidate.identifier === "string" ? candidate.identifier.trim() : "";
  const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
  if (!id || !identifier || !title) return undefined;
  return {
    id,
    identifier,
    title,
    status: typeof candidate.status === "string" ? candidate.status : undefined,
    stateType: typeof candidate.stateType === "string" ? candidate.stateType : undefined,
    sourceVaultDocumentPath:
      typeof candidate.sourceVaultDocumentPath === "string"
        ? candidate.sourceVaultDocumentPath
        : undefined,
    sourceVaultDocumentTitle:
      typeof candidate.sourceVaultDocumentTitle === "string"
        ? candidate.sourceVaultDocumentTitle
        : undefined,
  };
}

function parsePersistedLinearDocument(value: unknown): ActiveLinearDocument | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<ActiveLinearDocument>;
  const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
  const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
  if (!id || !title) return undefined;
  return {
    id,
    title,
    projectId: typeof candidate.projectId === "string" ? candidate.projectId : undefined,
  };
}

function readPersistedContentPanelState(): PersistedContentPanelState {
  try {
    const raw = localStorage.getItem(CONTENT_PANEL_STATE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};

    const linearSelection = parsePersistedLinearSelection(parsed.linearSelection);
    const linearWorkspaceViewRaw =
      typeof parsed.linearWorkspaceView === "string" ? parsed.linearWorkspaceView : null;
    const linearWorkspaceView =
      linearSelection && linearWorkspaceViewRaw
        ? isLinearWorkspaceViewIdForKind(linearSelection.kind, linearWorkspaceViewRaw)
          ? linearWorkspaceViewRaw
          : undefined
        : undefined;

    const state: PersistedContentPanelState = {
      linearSelection,
      activeLinearIssue: parsePersistedLinearIssue(parsed.activeLinearIssue),
      activeLinearDocument: parsePersistedLinearDocument(parsed.activeLinearDocument),
      linearWorkspaceView,
      issuesPanelMode:
        parsed.issuesPanelMode === "list" || parsed.issuesPanelMode === "board"
          ? parsed.issuesPanelMode
          : undefined,
      watchersPanelMode:
        parsed.watchersPanelMode === "list" || parsed.watchersPanelMode === "board"
          ? parsed.watchersPanelMode
          : undefined,
    };
    return state;
  } catch {
    return {};
  }
}

function writePersistedContentPanelState(state: PersistedContentPanelState) {
  try {
    localStorage.setItem(CONTENT_PANEL_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore private mode / quota errors.
  }
}

export type ContentPanelBreadcrumbSegment = {
  id: string;
  label: string;
  kind?: "linear-logo";
  navItemId?: SidebarNavItemId;
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
  status?: string;
  stateType?: string;
  sourceVaultDocumentPath?: string;
  sourceVaultDocumentTitle?: string;
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

export type ContentPanelTabSnapshot = {
  sidebarSegments: ContentPanelBreadcrumbSegment[];
  linearSelection: LinearWorkspaceSelection | null;
  activeVaultDocument: ActiveVaultDocument | null;
  activeLinearDocument: ActiveLinearDocument | null;
  activeLinearIssue: ActiveLinearIssue | null;
  focusContentSnapshot: FocusContentSnapshot | null;
  linearWorkspaceView: LinearWorkspaceViewId | null;
  issuesPanelMode: LinearProjectCollectionMode;
  watchersPanelMode: LinearProjectCollectionMode;
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
  issuesPanelMode: LinearProjectCollectionMode;
  setIssuesPanelMode: (mode: LinearProjectCollectionMode) => void;
  watchersPanelMode: LinearProjectCollectionMode;
  setWatchersPanelMode: (mode: LinearProjectCollectionMode) => void;
  contentPanelBarState: ContentPanelBarState | null;
  setContentPanelBarState: (state: ContentPanelBarState | null) => void;
  restoreContentPanelTabSnapshot: (snapshot: ContentPanelTabSnapshot) => void;
  linearIssueRefreshNonce: number;
  requestLinearIssueRefresh: () => void;
  resetProjectsOverview: () => void;
};

const ContentPanelNavigationContext = createContext<ContentPanelNavigationContextValue | null>(
  null,
);

export function ContentPanelNavigationProvider({ children }: { children: ReactNode }) {
  const persistedStateRef = useRef<PersistedContentPanelState | null>(null);
  if (persistedStateRef.current === null) {
    persistedStateRef.current = readPersistedContentPanelState();
  }
  const persistedState = persistedStateRef.current;
  const [sidebarSegments, setSidebarSegmentsState] = useState<ContentPanelBreadcrumbSegment[]>(
    [],
  );
  const [linearSelection, setLinearSelectionState] = useState<LinearWorkspaceSelection | null>(() =>
    persistedState.linearSelection ?? null,
  );
  const [activeVaultDocument, setActiveVaultDocumentState] = useState<ActiveVaultDocument | null>(
    null,
  );
  const [activeLinearIssue, setActiveLinearIssueState] = useState<ActiveLinearIssue | null>(() =>
    persistedState.activeLinearIssue ?? null,
  );
  const [activeLinearDocument, setActiveLinearDocumentState] = useState<ActiveLinearDocument | null>(
    () => persistedState.activeLinearDocument ?? null,
  );
  const [focusContentSnapshot, setFocusContentSnapshotState] = useState<FocusContentSnapshot | null>(
    null,
  );
  const [linearWorkspaceView, setLinearWorkspaceViewState] = useState<LinearWorkspaceViewId | null>(
    () => persistedState.linearWorkspaceView ?? null,
  );
  const [issuesPanelMode, setIssuesPanelModeState] = useState<LinearProjectCollectionMode>(
    () => persistedState.issuesPanelMode ?? "list",
  );
  const [watchersPanelMode, setWatchersPanelModeState] = useState<LinearProjectCollectionMode>(
    () => persistedState.watchersPanelMode ?? "board",
  );
  const [contentPanelBarState, setContentPanelBarStateState] = useState<ContentPanelBarState | null>(
    null,
  );
  const [linearIssueRefreshNonce, setLinearIssueRefreshNonce] = useState(0);
  const skipSelectionResetRef = useRef(false);

  const linearSelectionKey = linearSelection
    ? `${linearSelection.kind}:${linearSelection.id}`
    : null;
  const previousLinearSelectionKeyRef = useRef<string | null>(linearSelectionKey);

  useEffect(() => {
    if (previousLinearSelectionKeyRef.current === linearSelectionKey) {
      return;
    }
    previousLinearSelectionKeyRef.current = linearSelectionKey;
    if (skipSelectionResetRef.current) {
      skipSelectionResetRef.current = false;
      return;
    }
    setActiveVaultDocumentState(null);
    setActiveLinearDocumentState(null);
    setActiveLinearIssueState(null);
    setFocusContentSnapshotState(null);
    setLinearWorkspaceViewState(null);
    setIssuesPanelModeState("list");
    setWatchersPanelModeState("board");
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

  const setIssuesPanelMode = useCallback((mode: LinearProjectCollectionMode) => {
    setIssuesPanelModeState(mode);
  }, []);

  const setWatchersPanelMode = useCallback((mode: LinearProjectCollectionMode) => {
    setWatchersPanelModeState(mode);
  }, []);

  const setContentPanelBarState = useCallback((state: ContentPanelBarState | null) => {
    setContentPanelBarStateState(state);
  }, []);

  const restoreContentPanelTabSnapshot = useCallback((snapshot: ContentPanelTabSnapshot) => {
    const currentSelectionKey = linearSelection
      ? `${linearSelection.kind}:${linearSelection.id}`
      : null;
    const nextSelectionKey = snapshot.linearSelection
      ? `${snapshot.linearSelection.kind}:${snapshot.linearSelection.id}`
      : null;
    skipSelectionResetRef.current = currentSelectionKey !== nextSelectionKey;
    setSidebarSegmentsState(snapshot.sidebarSegments);
    setLinearSelectionState(snapshot.linearSelection);
    setActiveVaultDocumentState(snapshot.activeVaultDocument);
    setActiveLinearDocumentState(snapshot.activeLinearDocument);
    setActiveLinearIssueState(snapshot.activeLinearIssue);
    setFocusContentSnapshotState(snapshot.focusContentSnapshot);
    setLinearWorkspaceViewState(snapshot.linearWorkspaceView);
    setIssuesPanelModeState(snapshot.issuesPanelMode);
    setWatchersPanelModeState(snapshot.watchersPanelMode);
    setContentPanelBarStateState(null);
  }, [linearSelection]);

  const requestLinearIssueRefresh = useCallback(() => {
    setLinearIssueRefreshNonce((current) => current + 1);
  }, []);

  const resetProjectsOverview = useCallback(() => {
    setLinearSelectionState(null);
    setActiveLinearDocumentState(null);
    setActiveLinearIssueState(null);
    setFocusContentSnapshotState((current) =>
      current?.kind === "linear_issue" ||
      current?.kind === "linear_document" ||
      current?.kind === "linear_workspace"
        ? null
        : current,
    );
    setLinearWorkspaceViewState(null);
    setIssuesPanelModeState("list");
    setWatchersPanelModeState("board");
    setContentPanelBarStateState(null);
  }, []);

  useEffect(() => {
    writePersistedContentPanelState({
      linearSelection: linearSelection ?? undefined,
      activeLinearIssue: activeLinearIssue ?? undefined,
      activeLinearDocument: activeLinearDocument ?? undefined,
      linearWorkspaceView: linearWorkspaceView ?? undefined,
      issuesPanelMode,
      watchersPanelMode,
    });
  }, [
    activeLinearDocument,
    activeLinearIssue,
    issuesPanelMode,
    linearSelection,
    linearWorkspaceView,
    watchersPanelMode,
  ]);

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
      issuesPanelMode,
      setIssuesPanelMode,
      watchersPanelMode,
      setWatchersPanelMode,
      contentPanelBarState,
      setContentPanelBarState,
      restoreContentPanelTabSnapshot,
      linearIssueRefreshNonce,
      requestLinearIssueRefresh,
      resetProjectsOverview,
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
      linearIssueRefreshNonce,
      linearSelection,
      linearWorkspaceView,
      issuesPanelMode,
      watchersPanelMode,
      requestLinearIssueRefresh,
      resetProjectsOverview,
      restoreContentPanelTabSnapshot,
      setActiveLinearDocument,
      setActiveLinearIssue,
      setActiveVaultDocument,
      setContentPanelBarState,
      setFocusContentSnapshot,
      setLinearSelection,
      setLinearWorkspaceView,
      setIssuesPanelMode,
      setWatchersPanelMode,
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
