import type { ContentPanelBreadcrumbSegment } from "./contentPanelNavigation";
import { useContentPanelNavigation } from "./contentPanelNavigation";
import { ContentPanelBreadcrumb } from "./ContentPanelBreadcrumb";

export function ContentPanelBreadcrumbBar({
  segments,
}: {
  segments: ContentPanelBreadcrumbSegment[];
}) {
  const { contentPanelBarState } = useContentPanelNavigation();
  const message = contentPanelBarState?.message ?? null;
  const tone = contentPanelBarState?.tone ?? "default";

  return (
    <header className="content-panel-breadcrumb-bar">
      <ContentPanelBreadcrumb segments={segments} />
      <div className="content-panel-breadcrumb-actions">
        {message ? (
          <span
            className={[
              "content-panel-breadcrumb-status",
              tone === "error" ? "content-panel-breadcrumb-status--error" : null,
            ]
              .filter(Boolean)
              .join(" ")}
            role={tone === "error" ? "alert" : "status"}
            title={message}
          >
            {message}
          </span>
        ) : null}
      </div>
    </header>
  );
}
