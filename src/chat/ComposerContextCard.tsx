import type { ComposerContextItem } from "../lib/chatFocusContext";
import { LinearStatusIcon } from "./LinearStatusIcon";
import { DotScrollLoader } from "./DotScrollLoader";

export function ComposerContextCard({
  items,
  loading = false,
}: {
  items: ComposerContextItem[];
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
            {item.status || item.stateType ? (
              <span className="composer-context-card-item-icon">
                <LinearStatusIcon
                  status={item.status}
                  stateType={item.stateType}
                  title={item.status}
                />
              </span>
            ) : null}
            <span className="composer-context-card-item-label">
              {item.issueIdentifier && item.issueTitle ? (
                <>
                  <span className="composer-context-card-issue-id">{item.issueIdentifier}</span>
                  <span className="composer-context-card-issue-sep"> · </span>
                  <span className="composer-context-card-issue-title">{item.issueTitle}</span>
                </>
              ) : (
                item.label
              )}
            </span>
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
