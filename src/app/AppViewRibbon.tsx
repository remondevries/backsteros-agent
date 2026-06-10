import { APP_VIEWS, type AppView } from "./appViews";

export type { AppView } from "./appViews";

export function AppViewRibbon({
  activeView,
  onChange,
}: {
  activeView: AppView;
  onChange: (view: AppView) => void;
}) {
  return (
    <nav className="app-view-ribbon" aria-label="App sections">
      {APP_VIEWS.map((view) => {
        const isActive = activeView === view.id;
        return (
          <button
            key={view.id}
            type="button"
            className={`app-view-ribbon-item ${isActive ? "app-view-ribbon-item-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
            aria-label={view.label}
            title={view.label}
            onClick={() => onChange(view.id)}
          >
            <span className="app-view-ribbon-icon">{view.icon}</span>
          </button>
        );
      })}
    </nav>
  );
}
