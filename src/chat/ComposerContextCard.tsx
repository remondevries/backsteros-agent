import { DotScrollLoader } from "./DotScrollLoader";

export function ComposerContextCard({
  items,
  loading = false,
}: {
  items: Array<{ id: string; label: string }>;
  loading?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div
      className={`composer-context-card ${loading ? "composer-context-card--loading" : ""}`}
      aria-live="polite"
    >
      <ul className="composer-context-card-items">
        {items.map((item) => (
          <li key={item.id} className="composer-context-card-item">
            <span className="composer-context-card-item-label">{item.label}</span>
            {loading ? (
              <DotScrollLoader
                className="composer-context-card-loader"
                aria-label="Loading context"
              />
            ) : null}
          </li>
        ))}
      </ul>
      {loading ? (
        <p className="composer-context-card-status">Loading context…</p>
      ) : null}
    </div>
  );
}
