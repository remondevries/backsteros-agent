import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  ContentPanelBarState,
  DocumentDeleteBreadcrumbAction,
  IssueDeleteBreadcrumbAction,
  IssueViewModeBreadcrumbAction,
  IssuesWatcherBreadcrumbAction,
  ProjectDocumentsTabCreateAction,
  ProjectsBrowseSearchBreadcrumbAction,
} from "./contentPanelNavigation";
import type { SidebarNavItemId } from "../lib/sidebarNavItems";

export type IosMobileQuickAction = {
  id: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
};

export type IosMobileSearchAction = {
  label: string;
  disabled?: boolean;
  onActivate: () => void;
};

type ContentPanelChromeContextValue = {
  contentPanelBarState: ContentPanelBarState | null;
  setContentPanelBarState: (state: ContentPanelBarState | null) => void;
  issuesWatcherAction: IssuesWatcherBreadcrumbAction | null;
  setIssuesWatcherAction: (action: IssuesWatcherBreadcrumbAction | null) => void;
  issueViewModeAction: IssueViewModeBreadcrumbAction | null;
  setIssueViewModeAction: (action: IssueViewModeBreadcrumbAction | null) => void;
  documentDeleteAction: DocumentDeleteBreadcrumbAction | null;
  setDocumentDeleteAction: (action: DocumentDeleteBreadcrumbAction | null) => void;
  issueDeleteAction: IssueDeleteBreadcrumbAction | null;
  setIssueDeleteAction: (action: IssueDeleteBreadcrumbAction | null) => void;
  projectsBrowseSearchAction: ProjectsBrowseSearchBreadcrumbAction | null;
  setProjectsBrowseSearchAction: (action: ProjectsBrowseSearchBreadcrumbAction | null) => void;
  projectDocumentsCreateAction: ProjectDocumentsTabCreateAction | null;
  setProjectDocumentsCreateAction: (action: ProjectDocumentsTabCreateAction | null) => void;
  iosMobileQuickActions: IosMobileQuickAction[] | null;
  setIosMobileQuickActions: (actions: IosMobileQuickAction[] | null) => void;
  iosMobileSearchAction: IosMobileSearchAction | null;
  setIosMobileSearchAction: (action: IosMobileSearchAction | null) => void;
  iosMobileNavLoadingItem: SidebarNavItemId | null;
  setIosMobileNavLoadingItem: (item: SidebarNavItemId | null) => void;
  clearChrome: () => void;
};

const ContentPanelChromeContext = createContext<ContentPanelChromeContextValue | null>(null);

export function ContentPanelChromeProvider({ children }: { children: ReactNode }) {
  const [contentPanelBarState, setContentPanelBarStateState] = useState<ContentPanelBarState | null>(
    null,
  );
  const [issuesWatcherAction, setIssuesWatcherActionState] =
    useState<IssuesWatcherBreadcrumbAction | null>(null);
  const [issueViewModeAction, setIssueViewModeActionState] =
    useState<IssueViewModeBreadcrumbAction | null>(null);
  const [documentDeleteAction, setDocumentDeleteActionState] =
    useState<DocumentDeleteBreadcrumbAction | null>(null);
  const [issueDeleteAction, setIssueDeleteActionState] =
    useState<IssueDeleteBreadcrumbAction | null>(null);
  const [projectsBrowseSearchAction, setProjectsBrowseSearchActionState] =
    useState<ProjectsBrowseSearchBreadcrumbAction | null>(null);
  const [projectDocumentsCreateAction, setProjectDocumentsCreateActionState] =
    useState<ProjectDocumentsTabCreateAction | null>(null);
  const [iosMobileQuickActions, setIosMobileQuickActionsState] = useState<IosMobileQuickAction[] | null>(
    null,
  );
  const [iosMobileSearchAction, setIosMobileSearchActionState] = useState<IosMobileSearchAction | null>(
    null,
  );
  const [iosMobileNavLoadingItem, setIosMobileNavLoadingItemState] = useState<SidebarNavItemId | null>(
    null,
  );

  const setContentPanelBarState = useCallback((state: ContentPanelBarState | null) => {
    setContentPanelBarStateState(state);
  }, []);

  const setIssuesWatcherAction = useCallback((action: IssuesWatcherBreadcrumbAction | null) => {
    setIssuesWatcherActionState(action);
  }, []);

  const setIssueViewModeAction = useCallback((action: IssueViewModeBreadcrumbAction | null) => {
    setIssueViewModeActionState(action);
  }, []);

  const setDocumentDeleteAction = useCallback((action: DocumentDeleteBreadcrumbAction | null) => {
    setDocumentDeleteActionState(action);
  }, []);

  const setIssueDeleteAction = useCallback((action: IssueDeleteBreadcrumbAction | null) => {
    setIssueDeleteActionState(action);
  }, []);

  const setProjectsBrowseSearchAction = useCallback(
    (action: ProjectsBrowseSearchBreadcrumbAction | null) => {
      setProjectsBrowseSearchActionState(action);
    },
    [],
  );

  const setProjectDocumentsCreateAction = useCallback(
    (action: ProjectDocumentsTabCreateAction | null) => {
      setProjectDocumentsCreateActionState(action);
    },
    [],
  );

  const setIosMobileQuickActions = useCallback((actions: IosMobileQuickAction[] | null) => {
    setIosMobileQuickActionsState(actions);
  }, []);

  const setIosMobileSearchAction = useCallback((action: IosMobileSearchAction | null) => {
    setIosMobileSearchActionState(action);
  }, []);

  const setIosMobileNavLoadingItem = useCallback((item: SidebarNavItemId | null) => {
    setIosMobileNavLoadingItemState(item);
  }, []);

  const clearChrome = useCallback(() => {
    setContentPanelBarStateState(null);
    setIssuesWatcherActionState(null);
    setIssueViewModeActionState(null);
    setDocumentDeleteActionState(null);
    setIssueDeleteActionState(null);
    setProjectsBrowseSearchActionState(null);
    setProjectDocumentsCreateActionState(null);
    // iOS bottom-nav quick actions and search are owned by mounted explorers via
    // useIosMobileQuickActions / useIosExplorerSearchChrome — do not clear here or
    // re-tapping a tab (resetProjectsOverview) leaves the FAB missing until remount.
  }, []);

  const value = useMemo(
    () => ({
      contentPanelBarState,
      setContentPanelBarState,
      issuesWatcherAction,
      setIssuesWatcherAction,
      issueViewModeAction,
      setIssueViewModeAction,
      documentDeleteAction,
      setDocumentDeleteAction,
      issueDeleteAction,
      setIssueDeleteAction,
      projectsBrowseSearchAction,
      setProjectsBrowseSearchAction,
      projectDocumentsCreateAction,
      setProjectDocumentsCreateAction,
      iosMobileQuickActions,
      setIosMobileQuickActions,
      iosMobileSearchAction,
      setIosMobileSearchAction,
      iosMobileNavLoadingItem,
      setIosMobileNavLoadingItem,
      clearChrome,
    }),
    [
      clearChrome,
      contentPanelBarState,
      documentDeleteAction,
      issueDeleteAction,
      iosMobileQuickActions,
      iosMobileSearchAction,
      iosMobileNavLoadingItem,
      issueViewModeAction,
      issuesWatcherAction,
      projectDocumentsCreateAction,
      projectsBrowseSearchAction,
      setContentPanelBarState,
      setDocumentDeleteAction,
      setIssueDeleteAction,
      setIssueViewModeAction,
      setIssuesWatcherAction,
      setIosMobileQuickActions,
      setIosMobileSearchAction,
      setIosMobileNavLoadingItem,
      setProjectDocumentsCreateAction,
      setProjectsBrowseSearchAction,
    ],
  );

  return (
    <ContentPanelChromeContext.Provider value={value}>
      {children}
    </ContentPanelChromeContext.Provider>
  );
}

export function useContentPanelChrome() {
  const context = useContext(ContentPanelChromeContext);
  if (!context) {
    throw new Error("useContentPanelChrome must be used within ContentPanelChromeProvider");
  }
  return context;
}
