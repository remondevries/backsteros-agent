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
  IssueViewModeBreadcrumbAction,
  IssuesWatcherBreadcrumbAction,
} from "./contentPanelNavigation";

type ContentPanelChromeContextValue = {
  contentPanelBarState: ContentPanelBarState | null;
  setContentPanelBarState: (state: ContentPanelBarState | null) => void;
  issuesWatcherAction: IssuesWatcherBreadcrumbAction | null;
  setIssuesWatcherAction: (action: IssuesWatcherBreadcrumbAction | null) => void;
  issueViewModeAction: IssueViewModeBreadcrumbAction | null;
  setIssueViewModeAction: (action: IssueViewModeBreadcrumbAction | null) => void;
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

  const setContentPanelBarState = useCallback((state: ContentPanelBarState | null) => {
    setContentPanelBarStateState(state);
  }, []);

  const setIssuesWatcherAction = useCallback((action: IssuesWatcherBreadcrumbAction | null) => {
    setIssuesWatcherActionState(action);
  }, []);

  const setIssueViewModeAction = useCallback((action: IssueViewModeBreadcrumbAction | null) => {
    setIssueViewModeActionState(action);
  }, []);

  const clearChrome = useCallback(() => {
    setContentPanelBarStateState(null);
    setIssuesWatcherActionState(null);
    setIssueViewModeActionState(null);
  }, []);

  const value = useMemo(
    () => ({
      contentPanelBarState,
      setContentPanelBarState,
      issuesWatcherAction,
      setIssuesWatcherAction,
      issueViewModeAction,
      setIssueViewModeAction,
      clearChrome,
    }),
    [
      clearChrome,
      contentPanelBarState,
      issueViewModeAction,
      issuesWatcherAction,
      setContentPanelBarState,
      setIssueViewModeAction,
      setIssuesWatcherAction,
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
