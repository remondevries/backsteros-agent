import { useEffect, useState } from "react";
import type { LinearWorkspaceSelection } from "./linearWorkspaceSelection";
import { linearWorkspaceSelectionId } from "./linearWorkspaceSelection";
import { useContentPanelNavigation } from "./contentPanelNavigation";
import { useEnsureLinearWorkspaceVaultStructure } from "../hooks/useEnsureLinearWorkspaceVaultStructure";
import { useLinearWorkspaceFocusSnapshot } from "../hooks/useLinearWorkspaceFocusSnapshot";
import { registerLinearProjectViewNavigation } from "../lib/linearProjectViewNavigation";
import { registerContentPanelLocalBack } from "../lib/contentPanelLocalBack";
import { ProjectDocumentsPanel } from "./project-documents/ProjectDocumentsPanel";
import { ProjectMeetingsPanel } from "./project-documents/ProjectMeetingsPanel";
import { ProjectLettersPanel } from "./project-documents/ProjectLettersPanel";
import { TeamMeetingsPanel } from "./project-documents/TeamMeetingsPanel";
import { TeamLettersPanel } from "./project-documents/TeamLettersPanel";
import { ProjectIssuesPanel } from "./project-issues/ProjectIssuesPanel";
import { TeamIssuesPanel } from "./project-issues/TeamIssuesPanel";
import { ProjectWatchersKanbanPanel } from "./project-issues/ProjectWatchersKanbanPanel";
import { LinearIssueWatchersConfigPanel } from "./project-issues/LinearIssueWatchersConfigPanel";
import { ProjectOverviewPanel } from "./project-overview/ProjectOverviewPanel";
import { LinearProjectsTableView } from "./projects/LinearProjectsTableView";
import { LinearProjectViewTabs } from "./LinearProjectViewTabs";
import type { LinearProjectCollectionToggleOption } from "./LinearProjectListBoardToggle";
import { useLinearProjectWatcherPollProgress } from "../hooks/useLinearProjectWatcherPollProgress";
import { useIssuesWatcherBreadcrumbAction } from "../hooks/useIssuesWatcherBreadcrumbAction";
import { isIosDevice } from "../platform/iosStandalone";
import {
  defaultLinearWorkspaceViewId,
  isLinearWorkspaceViewIdForKind,
  linearWorkspaceViewLabel,
  type LinearWorkspaceViewId,
} from "./linearProjectViews";

function LinearWorkspaceViewPlaceholder({ message }: { message: string }) {
  return (
    <div className="linear-workspace-view-placeholder">
      <p>{message}</p>
    </div>
  );
}

function LinearWorkspaceDetailBody({
  selection,
  activeView,
  issuesPanelMode,
  issuesSettingsOpen,
}: {
  selection: LinearWorkspaceSelection;
  activeView: LinearWorkspaceViewId;
  issuesPanelMode: "list" | "board";
  issuesSettingsOpen: boolean;
}) {
  if (activeView === "overview" && selection.kind === "project") {
    return <ProjectOverviewPanel projectId={selection.id} enabled />;
  }

  if (activeView === "issues" && selection.kind === "project") {
    if (issuesSettingsOpen) {
      return (
        <LinearIssueWatchersConfigPanel
          projectId={selection.id}
          projectName={selection.name}
        />
      );
    }
    if (issuesPanelMode === "board") {
      return <ProjectWatchersKanbanPanel projectId={selection.id} enabled />;
    }
    return <ProjectIssuesPanel projectId={selection.id} enabled />;
  }

  if (activeView === "documents") {
    return (
      <ProjectDocumentsPanel
        projectId={selection.kind === "project" ? selection.id : null}
        teamId={selection.kind === "team" ? selection.id : null}
        enabled
      />
    );
  }

  if (activeView === "meetings" && selection.kind === "project") {
    return <ProjectMeetingsPanel projectId={selection.id} enabled />;
  }

  if (activeView === "meetings" && selection.kind === "team") {
    return <TeamMeetingsPanel teamId={selection.id} enabled />;
  }

  if (activeView === "letters" && selection.kind === "project") {
    return <ProjectLettersPanel projectId={selection.id} enabled />;
  }

  if (activeView === "letters" && selection.kind === "team") {
    return <TeamLettersPanel teamId={selection.id} enabled />;
  }

  if (activeView === "projects" && selection.kind === "team") {
    return <LinearProjectsTableView enabled teamId={selection.id} />;
  }

  if (activeView === "issues" && selection.kind === "team") {
    return <TeamIssuesPanel teamId={selection.id} enabled />;
  }

  if (activeView === "overview" && selection.kind === "team") {
    return (
      <LinearWorkspaceViewPlaceholder message="Team overview will appear here." />
    );
  }

  const label = linearWorkspaceViewLabel(selection.kind, activeView);

  return (
    <LinearWorkspaceViewPlaceholder message={`${label} will appear here.`} />
  );
}

function initialWorkspaceViewForSelection(
  selection: LinearWorkspaceSelection,
  preferredView: LinearWorkspaceViewId | null,
): LinearWorkspaceViewId {
  if (preferredView && isLinearWorkspaceViewIdForKind(selection.kind, preferredView)) {
    return preferredView;
  }
  return defaultLinearWorkspaceViewId(selection.kind);
}

export function LinearProjectContent({
  selection,
  vaultStructureEnabled,
}: {
  selection: LinearWorkspaceSelection;
  vaultStructureEnabled: boolean;
}) {
  const {
    linearWorkspaceView,
    setLinearWorkspaceView,
    issuesPanelMode,
    setIssuesPanelMode,
  } =
    useContentPanelNavigation();
  const [activeView, setActiveView] = useState<LinearWorkspaceViewId>(() =>
    initialWorkspaceViewForSelection(selection, linearWorkspaceView),
  );
  const [issuesSettingsOpen, setIssuesSettingsOpen] = useState(false);

  useEnsureLinearWorkspaceVaultStructure(selection, vaultStructureEnabled);
  useLinearWorkspaceFocusSnapshot();
  const iosDevice = isIosDevice();
  const effectiveIssuesPanelMode = iosDevice ? "list" : issuesPanelMode;

  const showCollectionModeToggle =
    !iosDevice && selection.kind === "project" && activeView === "issues";
  const showWatcherAction = selection.kind === "project";
  const collectionMode = issuesPanelMode;
  const collectionToggleOptions: readonly LinearProjectCollectionToggleOption[] = [
    { mode: "list", label: "List" },
    { mode: "board", label: "Board" },
  ];
  const collectionToggleAriaLabel = "Issues view mode";

  const { watcherActive, autoAssignActive, pollIntervalMs, animationKey } =
    useLinearProjectWatcherPollProgress(selection.kind === "project" ? selection.id : null, {
      settingsPanelOpen: issuesSettingsOpen,
    });

  useIssuesWatcherBreadcrumbAction(
    showWatcherAction
      ? {
          watcherActive,
          autoAssignActive,
          pollIntervalMs,
          animationKey,
          settingsActive: activeView === "issues" && issuesSettingsOpen,
          onToggle: () => {
            if (activeView !== "issues") {
              setActiveView("issues");
              setIssuesSettingsOpen(true);
              return;
            }
            setIssuesSettingsOpen((current) => !current);
          },
        }
      : null,
  );

  useEffect(() => {
    setActiveView(initialWorkspaceViewForSelection(selection, linearWorkspaceView));
  }, [linearWorkspaceView, selection]);

  useEffect(() => {
    if (activeView !== "issues" && issuesSettingsOpen) {
      setIssuesSettingsOpen(false);
    }
  }, [activeView, issuesSettingsOpen]);

  useEffect(() => {
    setLinearWorkspaceView(activeView);
  }, [activeView, setLinearWorkspaceView]);

  useEffect(() => {
    return registerContentPanelLocalBack(() => {
      if (!issuesSettingsOpen) return false;
      setIssuesSettingsOpen(false);
      return true;
    });
  }, [issuesSettingsOpen]);

  useEffect(() => {
    return registerLinearProjectViewNavigation({
      selectionKind: selection.kind,
      onSelectView: (nextView) => {
        setActiveView(nextView);
        setIssuesSettingsOpen((open) => (nextView === "issues" ? open : false));
      },
    });
  }, [selection.kind]);

  return (
    <div className="linear-workspace-content linear-project-content">
      <LinearProjectViewTabs
        selectionKind={selection.kind}
        activeView={activeView}
        onChange={(nextView) => {
          if (selection.kind === "project" && nextView === "issues" && activeView === "issues") {
            if (issuesSettingsOpen) {
              setIssuesSettingsOpen(false);
              return;
            }
            if (!iosDevice) {
              const nextMode = issuesPanelMode === "list" ? "board" : "list";
              setIssuesPanelMode(nextMode);
            }
            return;
          }
          setActiveView(nextView);
          if (nextView === "issues" && issuesSettingsOpen) {
            setIssuesSettingsOpen(false);
          }
        }}
        showCollectionModeToggle={showCollectionModeToggle}
        collectionMode={collectionMode}
        onCollectionModeChange={(mode) => {
          setIssuesPanelMode(mode);
          setIssuesSettingsOpen(false);
        }}
        collectionToggleOptions={collectionToggleOptions}
        collectionToggleAriaLabel={collectionToggleAriaLabel}
        issuesSettingsActive={issuesSettingsOpen}
      />
      <div
        className="linear-project-view-body"
        role="tabpanel"
        aria-label={`${selection.name} ${activeView}`}
        id={`${linearWorkspaceSelectionId(selection)}-${activeView}`}
      >
        <LinearWorkspaceDetailBody
          selection={selection}
          activeView={activeView}
          issuesPanelMode={effectiveIssuesPanelMode}
          issuesSettingsOpen={issuesSettingsOpen}
        />
      </div>
    </div>
  );
}
