import { LINEAR_PROJECT_VIEWS, type LinearProjectViewId } from "./linearProjectViews";

export function LinearProjectViewTabs({
  activeView,
  onChange,
}: {
  activeView: LinearProjectViewId;
  onChange: (view: LinearProjectViewId) => void;
}) {
  return (
    <div className="linear-project-view-tabs" role="tablist" aria-label="Team and project views">
      {LINEAR_PROJECT_VIEWS.map((view) => {
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
