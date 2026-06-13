import type { ContentPanelBreadcrumbSegment } from "./contentPanelNavigation";
import { LinearIcon } from "../chat/LinearIcon";
import { sidebarNavItemIcon } from "./sidebarNavConfig";

function BreadcrumbSegmentContent({
  segment,
  isLast,
}: {
  segment: ContentPanelBreadcrumbSegment;
  isLast: boolean;
}) {
  if (segment.kind === "linear-logo") {
    const content = (
      <span className="content-panel-breadcrumb-logo" title={segment.label}>
        <span className="content-panel-breadcrumb-icon">
          <LinearIcon size={14} />
        </span>
        <span
          className={isLast ? "content-panel-breadcrumb-current" : "content-panel-breadcrumb-logo-label"}
          aria-current={isLast ? "page" : undefined}
        >
          {segment.label}
        </span>
      </span>
    );

    if (segment.onActivate && !isLast) {
      return (
        <button
          type="button"
          className="content-panel-breadcrumb-button"
          onClick={segment.onActivate}
        >
          {content}
        </button>
      );
    }

    return (
      content
    );
  }

  const breadcrumbLabelClass = isLast
    ? "content-panel-breadcrumb-current"
    : "content-panel-breadcrumb-logo-label";
  const content = (
    <span className="content-panel-breadcrumb-logo" title={segment.label}>
      {segment.navItemId ? (
        <span className="content-panel-breadcrumb-icon" aria-hidden="true">
          {sidebarNavItemIcon(segment.navItemId)}
        </span>
      ) : null}
      <span className={breadcrumbLabelClass} aria-current={isLast ? "page" : undefined}>
        {segment.label}
      </span>
    </span>
  );

  const allowRootNavActivate = Boolean(segment.navItemId);

  if (segment.onActivate && (!isLast || allowRootNavActivate)) {
    return (
      <button
        type="button"
        className="content-panel-breadcrumb-button"
        onClick={segment.onActivate}
      >
        {content}
      </button>
    );
  }

  if (segment.navItemId) {
    return content;
  }

  return (
    <span className="content-panel-breadcrumb-current" aria-current={isLast ? "page" : undefined}>
      {segment.label}
    </span>
  );
}

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
            <BreadcrumbSegmentContent segment={segment} isLast={isLast} />
          </span>
        );
      })}
    </nav>
  );
}
