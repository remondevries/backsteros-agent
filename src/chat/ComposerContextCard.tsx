import type { ComposerContextItem } from "../lib/chatFocusContext";
import type { VaultNavItemId } from "../lib/vaultNavFolders";
import { sidebarNavItemIcon } from "../app/sidebarNavConfig";
import { LinearStatusIcon } from "./LinearStatusIcon";
import { DotScrollLoader } from "./DotScrollLoader";

function VaultFolderIcon({ navItemId }: { navItemId: VaultNavItemId | null }) {
  if (navItemId) {
    return (
      <span className="composer-context-card-breadcrumb-icon">
        {sidebarNavItemIcon(navItemId)}
      </span>
    );
  }

  return (
    <span className="composer-context-card-breadcrumb-icon">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M2.5 4.25h4.1l1.15 1.25H13.5a.75.75 0 0 1 .74.64l.26 2.11v5a.75.75 0 0 1-.75.75H3.25a.75.75 0 0 1-.75-.75v-9a.75.75 0 0 1 .75-.75Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

function VaultContextBreadcrumb({
  breadcrumb,
  contextGoUp,
}: {
  breadcrumb: NonNullable<ComposerContextItem["vaultBreadcrumb"]>;
  contextGoUp?: { label: string; onGoUp: () => void };
}) {
  const folderSegment = (
    <>
      <VaultFolderIcon navItemId={breadcrumb.navItemId} />
      <span className="composer-context-card-breadcrumb-folder-name">{breadcrumb.folderName}</span>
    </>
  );

  return (
    <div className="composer-context-card-breadcrumb">
      {contextGoUp ? (
        <button
          type="button"
          className="composer-context-card-breadcrumb-folder"
          onClick={contextGoUp.onGoUp}
          title={`Use ${contextGoUp.label} instead`}
          aria-label={`Switch context to ${breadcrumb.folderName}`}
        >
          {folderSegment}
        </button>
      ) : (
        <span className="composer-context-card-breadcrumb-folder composer-context-card-breadcrumb-folder--static">
          {folderSegment}
        </span>
      )}
      {breadcrumb.documentTitle ? (
        <>
          <span className="composer-context-card-breadcrumb-sep" aria-hidden="true">
            ›
          </span>
          <span className="composer-context-card-breadcrumb-document">{breadcrumb.documentTitle}</span>
        </>
      ) : null}
    </div>
  );
}

export function ComposerContextCard({
  items,
  loading = false,
  contextGoUp,
}: {
  items: ComposerContextItem[];
  loading?: boolean;
  contextGoUp?: {
    label: string;
    onGoUp: () => void;
  };
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
            <div className="composer-context-card-item-main">
              {item.vaultBreadcrumb ? (
                <VaultContextBreadcrumb
                  breadcrumb={item.vaultBreadcrumb}
                  contextGoUp={contextGoUp}
                />
              ) : (
                <>
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
                </>
              )}
              {loading ? (
                <DotScrollLoader
                  className="composer-context-card-loader"
                  aria-label="Loading context"
                />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {loading ? (
        <p className="composer-context-card-status">Loading context…</p>
      ) : null}
    </div>
  );
}
