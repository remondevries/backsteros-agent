import type { ContentPanelBreadcrumbSegment } from "./contentPanelNavigation";

export function ContentPanelBreadcrumb({
  segments,
}: {
  segments: ContentPanelBreadcrumbSegment[];
}) {
  if (segments.length === 0) {
    return (
      <nav className="content-panel-breadcrumb" aria-label="Location">
        <span className="content-panel-breadcrumb-current">Explorer</span>
      </nav>
    );
  }

  return (
    <nav className="content-panel-breadcrumb" aria-label="Location">
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        return (
          <span key={segment.id} className="content-panel-breadcrumb-item">
            {index > 0 ? <span className="content-panel-breadcrumb-sep">/</span> : null}
            {segment.onActivate && !isLast ? (
              <button
                type="button"
                className="content-panel-breadcrumb-button"
                onClick={segment.onActivate}
              >
                {segment.label}
              </button>
            ) : (
              <span
                className="content-panel-breadcrumb-current"
                aria-current={isLast ? "page" : undefined}
              >
                {segment.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
