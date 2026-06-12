import { useEffect, useState } from "react";
import type { LinearWorkspaceSelection } from "./linearWorkspaceSelection";
import { linearWorkspaceSelectionId } from "./linearWorkspaceSelection";
import { useContentPanelNavigation } from "./contentPanelNavigation";
import { useEnsureLinearWorkspaceVaultStructure } from "../hooks/useEnsureLinearWorkspaceVaultStructure";
import { useLinearWorkspaceFocusSnapshot } from "../hooks/useLinearWorkspaceFocusSnapshot";
import { ProjectDocumentsPanel } from "./project-documents/ProjectDocumentsPanel";
import { ProjectIssuesPanel } from "./project-issues/ProjectIssuesPanel";
import { ProjectOverviewPanel } from "./project-overview/ProjectOverviewPanel";
import { LinearProjectViewTabs } from "./LinearProjectViewTabs";
import {
  defaultLinearWorkspaceViewId,
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
}: {
  selection: LinearWorkspaceSelection;
  activeView: LinearWorkspaceViewId;
}) {
  if (activeView === "overview" && selection.kind === "project") {
    return <ProjectOverviewPanel projectId={selection.id} enabled />;
  }

  if (activeView === "issues" && selection.kind === "project") {
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

export function LinearProjectContent({
  selection,
  vaultStructureEnabled,
}: {
  selection: LinearWorkspaceSelection;
  vaultStructureEnabled: boolean;
}) {
  const { setLinearWorkspaceView } = useContentPanelNavigation();
  const [activeView, setActiveView] = useState<LinearWorkspaceViewId>(() =>
    defaultLinearWorkspaceViewId(selection.kind),
  );

  useEnsureLinearWorkspaceVaultStructure(selection, vaultStructureEnabled);
  useLinearWorkspaceFocusSnapshot();

  useEffect(() => {
    setActiveView(defaultLinearWorkspaceViewId(selection.kind));
  }, [selection.kind, selection.id]);

  useEffect(() => {
    setLinearWorkspaceView(activeView);
  }, [activeView, setLinearWorkspaceView]);

  return (
    <div className="linear-workspace-content linear-project-content">
      <LinearProjectViewTabs
        selectionKind={selection.kind}
        activeView={activeView}
        onChange={setActiveView}
      />
      <div
        className="linear-project-view-body"
        role="tabpanel"
        aria-label={`${selection.name} ${activeView}`}
        id={`${linearWorkspaceSelectionId(selection)}-${activeView}`}
      >
        <LinearWorkspaceDetailBody selection={selection} activeView={activeView} />
      </div>
    </div>
  );
}
