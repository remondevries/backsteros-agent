import { useCallback, useEffect, useRef } from "react";
import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import {
  appUrlPathsEqual,
  buildAppUrl,
  parseAppUrl,
  withPreservedSearch,
  type AppUrlLinearSelectionRef,
} from "../lib/appUrl";
import {
  fetchLinearIssueDetail,
  fetchLinearProjectById,
  fetchLinearTeams,
} from "../lib/api";
import type { SettingsTabId } from "../settings/settingsTabs";
import { formatVaultWorkoutDocumentLabel } from "../lib/workouts/workoutsBreadcrumb";
import { useContentPanelNavigation } from "./contentPanelNavigation";

type AppUrlSyncProps = {
  enabled: boolean;
  linearUserId: string | null;
  showSettings: boolean;
  onShowSettingsChange: (open: boolean) => void;
  activeSettingsTab: SettingsTabId;
  onSettingsTabChange: (tab: SettingsTabId) => void;
  activeVaultNavItem: SidebarNavItemId | null;
  onVaultNavItemChange: (item: SidebarNavItemId) => void;
};

async function resolveActiveIssueFromUrl(parsed: {
  linearIssueId: string | null;
  linearIssueIdentifier: string | null;
  linearIssueProjectSlug: string | null;
  navItem: SidebarNavItemId;
}): Promise<{
  issue: {
    id: string;
    identifier?: string;
    title: string;
    status?: string;
    stateType?: string;
    projectName?: string;
  };
  navItem: SidebarNavItemId;
  linearSelection: AppUrlLinearSelectionRef | null;
  linearWorkspaceView: "issues" | null;
} | null> {
  const issueRef = parsed.linearIssueIdentifier?.trim() || parsed.linearIssueId?.trim();
  if (!issueRef) return null;

  const result = await fetchLinearIssueDetail(issueRef);
  const issue = result.issue;
  if (issue) {
    const projectId = issue.projectId?.trim() || null;
    return {
      issue: {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        status: issue.status,
        stateType: issue.stateType,
        projectName: issue.projectName ?? undefined,
      },
      navItem:
        parsed.navItem === "inbox"
          ? "inbox"
          : projectId
            ? "projects"
            : parsed.navItem,
      linearSelection:
        parsed.navItem === "inbox"
          ? null
          : projectId
            ? { kind: "project", id: projectId }
            : null,
      linearWorkspaceView:
        parsed.navItem === "inbox" ? null : projectId ? "issues" : null,
    };
  }

  if (parsed.linearIssueIdentifier) {
    return {
      issue: {
        id: parsed.linearIssueIdentifier,
        identifier: parsed.linearIssueIdentifier,
        title: "Issue",
      },
      navItem:
        parsed.linearIssueProjectSlug === "inbox" ? "inbox" : parsed.navItem,
      linearSelection: null,
      linearWorkspaceView: null,
    };
  }

  return {
    issue: {
      id: issueRef,
      title: "Issue",
    },
    navItem: parsed.navItem,
    linearSelection: null,
    linearWorkspaceView: null,
  };
}

async function resolveLinearSelection(
  selection: AppUrlLinearSelectionRef,
): Promise<{ kind: "team" | "project"; id: string; name: string } | null> {
  if (selection.kind === "team") {
    const result = await fetchLinearTeams();
    const team = result.teams.find((entry) => entry.id === selection.id);
    return team
      ? { kind: "team", id: team.id, name: team.name }
      : { kind: "team", id: selection.id, name: "Team" };
  }

  const result = await fetchLinearProjectById(selection.id);
  const project = result.project;
  return project
    ? { kind: "project", id: project.id, name: project.name }
    : { kind: "project", id: selection.id, name: "Project" };
}

export function AppUrlSync({
  enabled,
  linearUserId,
  showSettings,
  onShowSettingsChange,
  activeSettingsTab,
  onSettingsTabChange,
  activeVaultNavItem,
  onVaultNavItemChange,
}: AppUrlSyncProps) {
  const {
    linearSelection,
    setLinearSelection,
    linearWorkspaceView,
    setLinearWorkspaceView,
    activeLinearIssue,
    setActiveLinearIssue,
    activeLinearDocument,
    setActiveLinearDocument,
    activeVaultDocument,
    setActiveVaultDocument,
    clearActiveLinearIssue,
    clearActiveLinearDocument,
    clearActiveVaultDocument,
  } = useContentPanelNavigation();

  const applyingUrlRef = useRef(false);
  const initialAppliedRef = useRef(false);
  const linearUserIdRef = useRef(linearUserId);
  linearUserIdRef.current = linearUserId;

  const applyParsedUrl = useCallback(
    async (pathname: string) => {
      const userId = linearUserIdRef.current;
      if (!enabled || !userId) return;

      const parsed = parseAppUrl(pathname);
      if (!parsed || parsed.userId !== userId) {
        return;
      }

      applyingUrlRef.current = true;
      try {
        onShowSettingsChange(parsed.showSettings);
        if (parsed.showSettings) {
          onSettingsTabChange(parsed.settingsTab);
          setLinearSelection(null);
          setLinearWorkspaceView(null);
          clearActiveLinearIssue();
          clearActiveLinearDocument();
          clearActiveVaultDocument();
          return;
        }

        onVaultNavItemChange(parsed.navItem);

        clearActiveLinearIssue();
        clearActiveLinearDocument();
        clearActiveVaultDocument();

        const issueFromUrl = await resolveActiveIssueFromUrl(parsed);
        if (issueFromUrl) {
          if (issueFromUrl.navItem !== parsed.navItem) {
            onVaultNavItemChange(issueFromUrl.navItem);
          }

          if (issueFromUrl.linearSelection) {
            const resolved = await resolveLinearSelection(issueFromUrl.linearSelection);
            setLinearSelection(resolved);
          } else if (parsed.linearSelection) {
            const resolved = await resolveLinearSelection(parsed.linearSelection);
            setLinearSelection(resolved);
          } else {
            setLinearSelection(null);
          }

          setLinearWorkspaceView(issueFromUrl.linearWorkspaceView ?? parsed.linearWorkspaceView);
          setActiveLinearIssue(issueFromUrl.issue);
          return;
        }

        if (parsed.linearSelection) {
          const resolved = await resolveLinearSelection(parsed.linearSelection);
          setLinearSelection(resolved);
        } else {
          setLinearSelection(null);
        }

        setLinearWorkspaceView(parsed.linearWorkspaceView);

        if (parsed.linearDocumentId) {
          setActiveLinearDocument({
            id: parsed.linearDocumentId,
            title: "Document",
          });
        } else if (parsed.vaultDocumentPath) {
          const rawTitle =
            parsed.vaultDocumentPath.split("/").filter(Boolean).pop() ??
            parsed.vaultDocumentPath;
          const title =
            parsed.navItem === "workouts"
              ? formatVaultWorkoutDocumentLabel(parsed.vaultDocumentPath, rawTitle)
              : rawTitle;
          setActiveVaultDocument({
            path: parsed.vaultDocumentPath,
            title,
          });
        }
      } finally {
        applyingUrlRef.current = false;
      }
    },
    [
      clearActiveLinearDocument,
      clearActiveLinearIssue,
      clearActiveVaultDocument,
      enabled,
      onSettingsTabChange,
      onShowSettingsChange,
      onVaultNavItemChange,
      setActiveLinearDocument,
      setActiveLinearIssue,
      setActiveVaultDocument,
      setLinearSelection,
      setLinearWorkspaceView,
    ],
  );

  const replaceUrlFromState = useCallback(() => {
    const userId = linearUserIdRef.current;
    if (!enabled || !userId || applyingUrlRef.current) return;

    const pathname = buildAppUrl({
      linearUserId: userId,
      showSettings,
      activeSettingsTab,
      activeVaultNavItem,
      linearSelection: linearSelection
        ? { kind: linearSelection.kind, id: linearSelection.id }
        : null,
      linearWorkspaceView,
      activeLinearIssueId: activeLinearIssue?.id ?? null,
      activeLinearIssueIdentifier: activeLinearIssue?.identifier ?? null,
      activeLinearIssueProjectName: activeLinearIssue?.projectName ?? null,
      activeLinearDocumentId: activeLinearDocument?.id ?? null,
      activeVaultDocumentPath: activeVaultDocument?.path ?? null,
    });

    const nextUrl = withPreservedSearch(pathname);
    const currentUrl = withPreservedSearch(window.location.pathname);
    if (!appUrlPathsEqual(currentUrl, nextUrl)) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }, [
    activeLinearDocument?.id,
    activeLinearIssue?.id,
    activeLinearIssue?.identifier,
    activeLinearIssue?.projectName,
    activeSettingsTab,
    activeVaultDocument?.path,
    activeVaultNavItem,
    enabled,
    linearSelection,
    linearWorkspaceView,
    showSettings,
  ]);

  useEffect(() => {
    if (!enabled || !linearUserId || initialAppliedRef.current) return;
    initialAppliedRef.current = true;

    const parsed = parseAppUrl(window.location.pathname);
    if (parsed && parsed.userId === linearUserId) {
      void applyParsedUrl(window.location.pathname);
      return;
    }

    replaceUrlFromState();
  }, [applyParsedUrl, enabled, linearUserId, replaceUrlFromState]);

  useEffect(() => {
    replaceUrlFromState();
  }, [replaceUrlFromState]);

  useEffect(() => {
    if (!enabled || !linearUserId) return;

    const handlePopState = () => {
      void applyParsedUrl(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [applyParsedUrl, enabled, linearUserId]);

  useEffect(() => {
    if (!enabled || !linearUserId || applyingUrlRef.current) return;

    const parsed = parseAppUrl(window.location.pathname);
    if (parsed && parsed.userId !== linearUserId) {
      replaceUrlFromState();
    }
  }, [enabled, linearUserId, replaceUrlFromState]);

  return null;
}
