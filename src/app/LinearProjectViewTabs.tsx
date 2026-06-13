import {
  linearWorkspaceViewsForKind,
  type LinearWorkspaceViewId,
} from "./linearProjectViews";
import {
  LinearProjectListBoardToggle,
  type LinearProjectCollectionMode,
  type LinearProjectCollectionToggleOption,
} from "./LinearProjectListBoardToggle";

export function LinearProjectViewTabs({
  selectionKind,
  activeView,
  onChange,
  showCollectionModeToggle = false,
  collectionMode = "list",
  onCollectionModeChange,
  collectionToggleOptions,
  collectionToggleAriaLabel,
}: {
  selectionKind: "team" | "project";
  activeView: LinearWorkspaceViewId;
  onChange: (view: LinearWorkspaceViewId) => void;
  showCollectionModeToggle?: boolean;
  collectionMode?: LinearProjectCollectionMode;
  onCollectionModeChange?: (mode: LinearProjectCollectionMode) => void;
  collectionToggleOptions?: readonly LinearProjectCollectionToggleOption[];
  collectionToggleAriaLabel?: string;
}) {
  const views = linearWorkspaceViewsForKind(selectionKind);

  return (
    <div className="linear-project-view-tabs">
      <div className="linear-project-view-tabs-list" role="tablist" aria-label="Team and project views">
        {views.map((view) => {
          const active = activeView === view.id;
          return (
            <button
              key={view.id}
              type="button"
              role="tab"
              className={`linear-project-view-tab ${active ? "linear-project-view-tab-active" : ""}`}
              aria-selected={active}
              onClick={() => onChange(view.id)}
            >
              {view.label}
            </button>
          );
        })}
      </div>
      {showCollectionModeToggle ? (
        <LinearProjectListBoardToggle
          mode={collectionMode}
          onChange={(mode) => onCollectionModeChange?.(mode)}
          options={collectionToggleOptions}
          ariaLabel={collectionToggleAriaLabel}
        />
      ) : null}
    </div>
  );
}
