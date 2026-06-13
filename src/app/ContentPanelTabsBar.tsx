import type { ReactNode } from "react";
import { useContentPanelNavigation } from "./contentPanelNavigation";
import { RefreshIcon } from "./RefreshIcon";

type ContentPanelTab = {
  id: string;
  label: string;
  icon?: ReactNode;
};

function ContentPanelTabIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.18" />
      <circle cx="5.5" cy="6.3" r="1" fill="currentColor" />
      <circle cx="10.5" cy="6.3" r="1" fill="currentColor" />
      <path
        d="M4.6 9.6a.75.75 0 0 1 1.04.2c.5.75 1.35 1.2 2.36 1.2 1 0 1.85-.45 2.36-1.2a.75.75 0 1 1 1.24.84A4.35 4.35 0 0 1 8 12.3a4.35 4.35 0 0 1-3.6-1.86.75.75 0 0 1 .2-1.04Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ContentPanelTabsBar({
  tabs,
  activeTabId,
  onSelectTab,
  onAddTab,
}: {
  tabs: ContentPanelTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onAddTab: () => void;
}) {
  const { contentPanelBarState } = useContentPanelNavigation();
  const refreshing = contentPanelBarState?.refreshing ?? false;
  const onRefresh = contentPanelBarState?.onRefresh ?? null;
  const message = contentPanelBarState?.message ?? null;
  const tone = contentPanelBarState?.tone ?? "default";

  return (
    <header className="content-panel-tabs-bar">
      <div className="content-panel-tabs-list" role="tablist" aria-label="Content tabs">
        {tabs.map((tab) => {
          const active = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={[
                "content-panel-tab",
                active ? "content-panel-tab-active" : null,
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelectTab(tab.id)}
              title={tab.label}
            >
              <span className="content-panel-tab-content">
                <span className="content-panel-tab-icon" aria-hidden="true">
                  {tab.icon ?? <ContentPanelTabIcon />}
                </span>
                <span className="content-panel-tab-label">{tab.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="content-panel-tabs-actions">
        <button
          type="button"
          className="content-panel-tab-add"
          aria-label="Add tab"
          onClick={onAddTab}
        >
          +
        </button>
        {message ? (
          <span
            className={[
              "content-panel-tabs-status",
              tone === "error" ? "content-panel-tabs-status--error" : null,
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
          className="content-panel-tab-refresh"
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
