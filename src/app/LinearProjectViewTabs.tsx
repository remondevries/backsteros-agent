import {
  linearWorkspaceViewsForKind,
  type LinearWorkspaceViewId,
} from "./linearProjectViews";

export function LinearProjectViewTabs({
  selectionKind,
  activeView,
  onChange,
}: {
  selectionKind: "team" | "project";
  activeView: LinearWorkspaceViewId;
  onChange: (view: LinearWorkspaceViewId) => void;
}) {
  const views = linearWorkspaceViewsForKind(selectionKind);

  return (
    <div className="linear-project-view-tabs" role="tablist" aria-label="Team and project views">
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
  );
}
