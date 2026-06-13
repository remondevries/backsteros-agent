import type { ContentPanelBreadcrumbSegment } from "./contentPanelNavigation";
import { ContentPanelBreadcrumb } from "./ContentPanelBreadcrumb";

export function ContentPanelBreadcrumbBar({
  segments,
}: {
  segments: ContentPanelBreadcrumbSegment[];
}) {
  return (
    <header className="content-panel-breadcrumb-bar">
      <ContentPanelBreadcrumb segments={segments} />
    </header>
  );
}
