import { useEffect, useState } from "react";
import type { LinearWorkspaceSelection } from "./linearWorkspaceSelection";
import { linearWorkspaceSelectionId } from "./linearWorkspaceSelection";
import { useEnsureLinearWorkspaceVaultStructure } from "../hooks/useEnsureLinearWorkspaceVaultStructure";
import { ProjectOverviewPanel } from "./project-overview/ProjectOverviewPanel";
import { LinearProjectViewTabs } from "./LinearProjectViewTabs";
import { type LinearProjectViewId } from "./linearProjectViews";

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
  activeView: LinearProjectViewId;
}) {
  if (activeView === "overview" && selection.kind === "project") {
    return <ProjectOverviewPanel projectId={selection.id} enabled />;
  }

  if (activeView === "overview" && selection.kind === "team") {
    return (
      <LinearWorkspaceViewPlaceholder message="Team overview will appear here." />
    );
  }

  return (
    <LinearWorkspaceViewPlaceholder
      message={`${activeView.charAt(0).toUpperCase()}${activeView.slice(1)} will appear here.`}
    />
  );
}

export function LinearProjectContent({
  selection,
  vaultStructureEnabled,
}: {
  selection: LinearWorkspaceSelection;
  vaultStructureEnabled: boolean;
}) {
  const [activeView, setActiveView] = useState<LinearProjectViewId>("overview");

  useEnsureLinearWorkspaceVaultStructure(selection, vaultStructureEnabled);

  useEffect(() => {
    setActiveView("overview");
  }, [selection.kind, selection.id]);

  return (
    <div className="linear-workspace-content linear-project-content">
      <LinearProjectViewTabs activeView={activeView} onChange={setActiveView} />
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
