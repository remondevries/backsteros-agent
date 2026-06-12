import { useEffect, useMemo, useState } from "react";
import { WhoopMetricDots } from "../chat/WhoopMetricDots";
import { vaultNavItemLabel, type VaultNavItemId } from "../lib/vaultNavFolders";
import { formatVaultNoteDisplayName } from "../lib/vaultNoteDisplayName";
import { resolveTodayDailyNoteDocument } from "../lib/resolveTodayDailyNoteDocument";
import { whoopSnapshotFromStats } from "../lib/whoopSnapshotFromStats";
import { useVaultDirectory } from "../hooks/useVaultDirectory";
import {
  useContentPanelNavigation,
  useContentPanelSidebarBreadcrumbs,
} from "./contentPanelNavigation";

function splitRelativePath(path: string): string[] {
  return path.split("/").filter(Boolean);
}

export function VaultFolderExplorer({
  activeNavItem,
  enabled,
}: {
  activeNavItem: VaultNavItemId;
  enabled: boolean;
}) {
  const { activeVaultDocument, setActiveVaultDocument } = useContentPanelNavigation();
  const rootPath = vaultNavItemLabel(activeNavItem);
  const [relativePath, setRelativePath] = useState<string>(rootPath);

  const { entries, loading, error } = useVaultDirectory(relativePath, enabled);

  useEffect(() => {
    setRelativePath(vaultNavItemLabel(activeNavItem));
  }, [activeNavItem]);

  useEffect(() => {
    if (!enabled || activeNavItem !== "daily") return;

    let cancelled = false;
    void resolveTodayDailyNoteDocument().then((document) => {
      if (cancelled || !document) return;
      setActiveVaultDocument(document);
    });

    return () => {
      cancelled = true;
    };
  }, [activeNavItem, enabled, setActiveVaultDocument]);

  const openVaultNote = (path: string, title: string) => {
    setActiveVaultDocument({ path, title });
  };

  const sidebarBreadcrumbs = useMemo(() => {
    const pathSegments = splitRelativePath(relativePath);
    return pathSegments.slice(1).map((segment, index) => {
      const path = pathSegments.slice(0, index + 2).join("/");
      return {
        id: `vault-${path}`,
        label: segment,
        onActivate: () => setRelativePath(path),
      };
    });
  }, [relativePath]);

  useContentPanelSidebarBreadcrumbs(sidebarBreadcrumbs, enabled);

  return (
    <div className="vault-folder-explorer">
      {loading ? <p className="vault-folder-explorer-status">Loading…</p> : null}
      {error ? (
        <p className="vault-folder-explorer-status vault-folder-explorer-status-error">{error}</p>
      ) : null}

      {!loading && !error ? (
        entries.length > 0 ? (
          <ul className="vault-folder-explorer-list">
            {entries.map((entry) => {
              const whoopSnapshot =
                entry.kind === "file" && entry.date && entry.whoop
                  ? whoopSnapshotFromStats(entry.date, entry.whoop)
                  : null;
              const displayName = formatVaultNoteDisplayName(entry.name);
              const selected =
                entry.kind === "file" && activeVaultDocument?.path === entry.path;

              return (
              <li key={entry.path} className="vault-folder-explorer-item">
                {entry.kind === "directory" ? (
                  <button
                    type="button"
                    className="vault-folder-explorer-entry vault-folder-explorer-entry-directory"
                    onClick={() => setRelativePath(entry.path)}
                  >
                    <span className="vault-folder-explorer-entry-name">{entry.name}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className={[
                      "vault-folder-explorer-entry",
                      "vault-folder-explorer-entry-file",
                      "vault-folder-explorer-entry-selectable",
                      selected ? "vault-folder-explorer-entry-selected" : null,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-current={selected ? "page" : undefined}
                    onClick={() => openVaultNote(entry.path, displayName)}
                  >
                    <span className="vault-folder-explorer-entry-name">{displayName}</span>
                    {whoopSnapshot ? <WhoopMetricDots snapshot={whoopSnapshot} /> : null}
                  </button>
                )}
              </li>
              );
            })}
          </ul>
        ) : (
          <p className="vault-folder-explorer-status">This folder is empty.</p>
        )
      ) : null}
    </div>
  );
}
