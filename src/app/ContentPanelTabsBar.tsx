import type { ReactNode } from "react";
import { useContentPanelChrome } from "./contentPanelChromeContext";
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
  onCloseTab,
  navigationCollapsed = false,
  onOpenNavigation,
}: {
  tabs: ContentPanelTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onAddTab: () => void;
  onCloseTab: (tabId: string) => void;
  navigationCollapsed?: boolean;
  onOpenNavigation?: () => void;
}) {
  const { contentPanelBarState } = useContentPanelChrome();
  const refreshing = contentPanelBarState?.refreshing ?? false;
  const onRefresh = contentPanelBarState?.onRefresh ?? null;
  const message = contentPanelBarState?.message ?? null;
  const tone = contentPanelBarState?.tone ?? "default";

  return (
    <header className="content-panel-tabs-bar">
      {navigationCollapsed && onOpenNavigation ? (
        <button
          type="button"
          className="content-panel-navigation-toggle"
          aria-label="Open navigation"
          title="Open navigation"
          onClick={onOpenNavigation}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M4.25 2C2.45508 2 1 3.45508 1 5.25V10.75C1 12.5449 2.45508 14 4.25 14H11.75C13.5449 14 15 12.5449 15 10.75V5.25C15 3.45508 13.5449 2 11.75 2H4.25ZM2.5 5.5C2.5 4.39543 3.39543 3.5 4.5 3.5H11.5C12.6046 3.5 13.5 4.39543 13.5 5.5V10.5C13.5 11.6046 12.6046 12.5 11.5 12.5H4.5C3.39543 12.5 2.5 11.6046 2.5 10.5V5.5Z"
              fill="currentColor"
            />
            <rect x="4" y="5" width="1.5" height="6" rx="0.75" fill="currentColor" />
          </svg>
        </button>
      ) : null}
      <div className="content-panel-tabs-list" role="tablist" aria-label="Content tabs">
        {tabs.map((tab) => {
          const active = tab.id === activeTabId;
          return (
            <span
              key={tab.id}
              role="tab"
              tabIndex={0}
              aria-selected={active}
              className={[
                "content-panel-tab",
                active ? "content-panel-tab-active" : null,
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelectTab(tab.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectTab(tab.id);
                }
              }}
              title={tab.label}
            >
              <span className="content-panel-tab-content">
                <span className="content-panel-tab-icon" aria-hidden="true">
                  {tab.icon ?? <ContentPanelTabIcon />}
                </span>
                <span className="content-panel-tab-label">{tab.label}</span>
              </span>
              <span className="content-panel-tab-close-fade" aria-hidden="true" />
              <button
                type="button"
                className="content-panel-tab-close"
                aria-label={`Close ${tab.label}`}
                title={`Close ${tab.label}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onCloseTab(tab.id);
                }}
              >
                ×
              </button>
            </span>
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
