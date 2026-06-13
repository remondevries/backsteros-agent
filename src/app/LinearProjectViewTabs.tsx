import {
  linearWorkspaceViewsForKind,
  type LinearWorkspaceViewId,
} from "./linearProjectViews";
import { linearProjectViewShortcutHint } from "../shortcuts/linearProjectViewShortcutBindings";
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
  issuesSettingsActive = false,
}: {
  selectionKind: "team" | "project";
  activeView: LinearWorkspaceViewId;
  onChange: (view: LinearWorkspaceViewId) => void;
  showCollectionModeToggle?: boolean;
  collectionMode?: LinearProjectCollectionMode;
  onCollectionModeChange?: (mode: LinearProjectCollectionMode) => void;
  collectionToggleOptions?: readonly LinearProjectCollectionToggleOption[];
  collectionToggleAriaLabel?: string;
  issuesSettingsActive?: boolean;
}) {
  const views = linearWorkspaceViewsForKind(selectionKind);
  const showRightControls = showCollectionModeToggle;

  return (
    <div className="linear-project-view-tabs">
      <div className="linear-project-view-tabs-list" role="tablist" aria-label="Team and project views">
        {views.map((view, index) => {
          const active = activeView === view.id && !(issuesSettingsActive && view.id === "issues");
          const shortcut = linearProjectViewShortcutHint(index);
          return (
            <button
              key={view.id}
              type="button"
              role="tab"
              className={`linear-project-view-tab ${active ? "linear-project-view-tab-active" : ""}`}
              aria-selected={active}
              aria-keyshortcuts={shortcut}
              title={shortcut ? `${view.label} (${shortcut})` : view.label}
              onClick={() => onChange(view.id)}
            >
              {view.label}
            </button>
          );
        })}
      </div>
      {showRightControls ? (
        <div className="linear-project-view-tabs-controls">
          {showCollectionModeToggle ? (
            <LinearProjectListBoardToggle
              mode={collectionMode}
              onChange={(mode) => onCollectionModeChange?.(mode)}
              options={collectionToggleOptions}
              ariaLabel={collectionToggleAriaLabel}
              neutral={issuesSettingsActive}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
