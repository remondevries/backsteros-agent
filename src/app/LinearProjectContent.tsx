import { useEffect, useState } from "react";
import type { LinearWorkspaceSelection } from "./linearWorkspaceSelection";
import { linearWorkspaceSelectionId } from "./linearWorkspaceSelection";
import { useContentPanelNavigation } from "./contentPanelNavigation";
import { useEnsureLinearWorkspaceVaultStructure } from "../hooks/useEnsureLinearWorkspaceVaultStructure";
import { useLinearWorkspaceFocusSnapshot } from "../hooks/useLinearWorkspaceFocusSnapshot";
import { ProjectDocumentsPanel } from "./project-documents/ProjectDocumentsPanel";
import { ProjectIssuesPanel } from "./project-issues/ProjectIssuesPanel";
import { ProjectWatchersKanbanPanel } from "./project-issues/ProjectWatchersKanbanPanel";
import { ProjectOverviewPanel } from "./project-overview/ProjectOverviewPanel";
import { LinearProjectViewTabs } from "./LinearProjectViewTabs";
import type { LinearProjectCollectionToggleOption } from "./LinearProjectListBoardToggle";
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

function LinearWorkspaceEmptyPage() {
  return <div className="linear-workspace-view-placeholder" aria-hidden="true" />;
}

function LinearWorkspaceDetailBody({
  selection,
  activeView,
  issuesPanelMode,
  watchersPanelMode,
}: {
  selection: LinearWorkspaceSelection;
  activeView: LinearWorkspaceViewId;
  issuesPanelMode: "list" | "board";
  watchersPanelMode: "list" | "board";
}) {
  if (activeView === "overview" && selection.kind === "project") {
    return <ProjectOverviewPanel projectId={selection.id} enabled />;
  }

  if (activeView === "issues" && selection.kind === "project") {
    if (issuesPanelMode === "board") {
      return <ProjectWatchersKanbanPanel projectId={selection.id} enabled />;
    }
    return <ProjectIssuesPanel projectId={selection.id} enabled />;
  }

  if (activeView === "watchers" && selection.kind === "project") {
    if (watchersPanelMode === "list") {
      return <LinearWorkspaceEmptyPage />;
    }
    return <ProjectWatchersKanbanPanel projectId={selection.id} enabled />;
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
    watchersPanelMode,
    setWatchersPanelMode,
  } =
    useContentPanelNavigation();
  const [activeView, setActiveView] = useState<LinearWorkspaceViewId>(() =>
    initialWorkspaceViewForSelection(selection, linearWorkspaceView),
  );

  useEnsureLinearWorkspaceVaultStructure(selection, vaultStructureEnabled);
  useLinearWorkspaceFocusSnapshot();

  const showCollectionModeToggle =
    selection.kind === "project" && (activeView === "issues" || activeView === "watchers");
  const collectionMode = activeView === "issues" ? issuesPanelMode : watchersPanelMode;
  const collectionToggleOptions: readonly LinearProjectCollectionToggleOption[] =
    activeView === "watchers"
      ? [
          { mode: "board", label: "Board" },
          { mode: "list", label: "Config" },
        ]
      : [
          { mode: "list", label: "List" },
          { mode: "board", label: "Board" },
        ];
  const collectionToggleAriaLabel =
    activeView === "watchers" ? "Watchers view mode" : "Issues view mode";

  useEffect(() => {
    setActiveView(initialWorkspaceViewForSelection(selection, linearWorkspaceView));
  }, [linearWorkspaceView, selection]);

  useEffect(() => {
    setLinearWorkspaceView(activeView);
  }, [activeView, setLinearWorkspaceView]);

  return (
    <div className="linear-workspace-content linear-project-content">
      <LinearProjectViewTabs
        selectionKind={selection.kind}
        activeView={activeView}
        onChange={setActiveView}
        showCollectionModeToggle={showCollectionModeToggle}
        collectionMode={collectionMode}
        onCollectionModeChange={activeView === "issues" ? setIssuesPanelMode : setWatchersPanelMode}
        collectionToggleOptions={collectionToggleOptions}
        collectionToggleAriaLabel={collectionToggleAriaLabel}
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
          issuesPanelMode={issuesPanelMode}
          watchersPanelMode={watchersPanelMode}
        />
      </div>
    </div>
  );
}
