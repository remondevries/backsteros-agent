import { useContentPanelNavigation } from "./contentPanelNavigation";
import { LinearProjectContent } from "./LinearProjectContent";

export function LinearWorkspaceContent({
  vaultStructureEnabled,
}: {
  vaultStructureEnabled: boolean;
}) {
  const { linearSelection } = useContentPanelNavigation();

  if (!linearSelection) {
    return (
      <div className="linear-workspace-content linear-workspace-content-empty">
        <p className="linear-workspace-content-placeholder">
          Select a team or project to open it here.
        </p>
      </div>
    );
  }

  return <LinearProjectContent selection={linearSelection} vaultStructureEnabled={vaultStructureEnabled} />;
}
