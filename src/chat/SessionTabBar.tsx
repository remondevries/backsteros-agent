import { useEffect, useRef, useState } from "react";

type SessionTabBarProps = {
  tabs: Array<{ sessionId: string; title: string }>;
  activeSessionId: string | null;
  renamingSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onClose: (sessionId: string) => void;
  onNewTab: () => void;
  onRenameCommit: (sessionId: string, title: string) => void;
  onRenameCancel: () => void;
};

function SessionTabLabel({
  tab,
  renaming,
  onSelect,
  onRenameCommit,
  onRenameCancel,
}: {
  tab: { sessionId: string; title: string };
  renaming: boolean;
  onSelect: (sessionId: string) => void;
  onRenameCommit: (sessionId: string, title: string) => void;
  onRenameCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(tab.title);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!renaming) return;
    cancelledRef.current = false;
    setDraft(tab.title);
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [renaming, tab.title]);

  if (renaming) {
    const commit = () => {
      if (cancelledRef.current) {
        cancelledRef.current = false;
        return;
      }
      onRenameCommit(tab.sessionId, draft);
    };

    return (
      <span className="session-tab-rename-field">
        <span className="session-tab-rename-sizer" aria-hidden="true">
          {draft || "\u00a0"}
        </span>
        <input
          ref={inputRef}
          className="session-tab-rename-input"
          value={draft}
          aria-label="Rename chat session"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              cancelledRef.current = true;
              onRenameCancel();
            }
          }}
          onBlur={commit}
          onClick={(event) => event.stopPropagation()}
        />
      </span>
    );
  }

  return (
    <button
      type="button"
      className="session-tab-label"
      onClick={() => onSelect(tab.sessionId)}
      title={tab.title}
    >
      {tab.title}
    </button>
  );
}

export function SessionTabBar({
  tabs,
  activeSessionId,
  renamingSessionId,
  onSelect,
  onClose,
  onNewTab,
  onRenameCommit,
  onRenameCancel,
}: SessionTabBarProps) {
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const showTabStrip = tabs.length > 1 || renamingSessionId !== null;

  useEffect(() => {
    if (!activeSessionId || !showTabStrip) return;
    tabRefs.current.get(activeSessionId)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [activeSessionId, showTabStrip, tabs.length]);

  return (
    <div className={`session-chrome ${showTabStrip ? "" : "session-chrome-single"}`}>
      <div
        className="chat-header-traffic-hover"
        data-tauri-drag-region={false}
      />
      <div className="session-chrome-drag" data-tauri-drag-region />
      {showTabStrip && (
        <div className="session-tab-bar" data-tauri-drag-region={false}>
          <div className="session-tab-list" role="tablist" aria-label="Chat sessions">
            {tabs.map((tab) => {
              const active = tab.sessionId === activeSessionId;
              const renaming = tab.sessionId === renamingSessionId;
              return (
                <div
                  key={tab.sessionId}
                  ref={(node) => {
                    if (node) {
                      tabRefs.current.set(tab.sessionId, node);
                    } else {
                      tabRefs.current.delete(tab.sessionId);
                    }
                  }}
                  className={`session-tab ${active ? "session-tab-active" : ""} ${renaming ? "session-tab-renaming" : ""}`}
                  role="tab"
                  aria-selected={active}
                >
                  <SessionTabLabel
                    tab={tab}
                    renaming={renaming}
                    onSelect={onSelect}
                    onRenameCommit={onRenameCommit}
                    onRenameCancel={onRenameCancel}
                  />
                  {!renaming && tabs.length > 1 && (
                    <button
                      type="button"
                      className="session-tab-close"
                      aria-label={`Close ${tab.title}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onClose(tab.sessionId);
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="session-tab-new"
            aria-label="New chat session"
            onClick={onNewTab}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
