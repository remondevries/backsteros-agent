import { useContentPanelChrome } from "./contentPanelChromeContext";
import { RefreshIcon } from "./RefreshIcon";

export function ContentPanelChromeStatus({ className }: { className?: string }) {
  const { contentPanelBarState } = useContentPanelChrome();
  const refreshing = contentPanelBarState?.refreshing ?? false;
  const onRefresh = contentPanelBarState?.onRefresh ?? null;
  const message = contentPanelBarState?.message ?? null;
  const tone = contentPanelBarState?.tone ?? "default";

  if (!message && !onRefresh) {
    return null;
  }

  return (
    <div
      className={["content-panel-chrome-status", className].filter(Boolean).join(" ")}
      aria-busy={refreshing}
    >
      {message ? (
        <span
          className={[
            "content-panel-chrome-status-message",
            tone === "error" ? "content-panel-chrome-status-message--error" : null,
          ]
            .filter(Boolean)
            .join(" ")}
          role={tone === "error" ? "alert" : "status"}
          title={message}
        >
          {message}
        </span>
      ) : null}
      {onRefresh ? (
        <button
          type="button"
          className="content-panel-chrome-status-refresh"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh"
          title="Refresh"
        >
          <RefreshIcon spinning={refreshing} />
        </button>
      ) : null}
    </div>
  );
}
