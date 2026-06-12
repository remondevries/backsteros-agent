import type { ContentPanelBreadcrumbSegment } from "./contentPanelNavigation";
import { useContentPanelNavigation } from "./contentPanelNavigation";
import { ContentPanelBreadcrumb } from "./ContentPanelBreadcrumb";
import { RefreshIcon } from "./RefreshIcon";

export function ContentPanelBreadcrumbBar({
  segments,
}: {
  segments: ContentPanelBreadcrumbSegment[];
}) {
  const { contentPanelBarState } = useContentPanelNavigation();
  const message = contentPanelBarState?.message ?? null;
  const tone = contentPanelBarState?.tone ?? "default";
  const refreshing = contentPanelBarState?.refreshing ?? false;
  const onRefresh = contentPanelBarState?.onRefresh ?? null;

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
        <button
          type="button"
          className="content-panel-breadcrumb-refresh"
          onClick={onRefresh ?? undefined}
          disabled={!onRefresh || refreshing}
          aria-label="Refresh"
          title="Refresh"
        >
          <RefreshIcon spinning={refreshing} />
        </button>
      </div>
    </header>
  );
}
