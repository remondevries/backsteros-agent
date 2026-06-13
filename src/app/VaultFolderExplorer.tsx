import { useEffect, useMemo, useState } from "react";
import { WhoopMetricDots } from "../chat/WhoopMetricDots";
import { vaultNavItemLabel, type VaultNavItemId } from "../lib/vaultNavFolders";
import { formatVaultNoteDisplayName } from "../lib/vaultNoteDisplayName";
import { isDailyVaultNotePath } from "../lib/vaultNotePaths";
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
  const [searchQuery, setSearchQuery] = useState("");

  const { entries, loading, error } = useVaultDirectory(relativePath, enabled);
  const showDailySearch = activeNavItem === "daily";

  useEffect(() => {
    setRelativePath(vaultNavItemLabel(activeNavItem));
    setSearchQuery("");
  }, [activeNavItem]);

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

  const orderedEntries = useMemo(() => {
    if (entries.length <= 1) return entries;
    const directories = entries.filter((entry) => entry.kind === "directory");
    const filesNewestFirst = entries
      .filter((entry) => entry.kind === "file")
      .slice()
      .reverse();
    return [...directories, ...filesNewestFirst];
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!showDailySearch || query.length === 0) {
      return orderedEntries;
    }
    return orderedEntries.filter((entry) => {
      const entryLabel =
        entry.kind === "file" ? formatVaultNoteDisplayName(entry.name) : entry.name;
      return entryLabel.toLocaleLowerCase().includes(query);
    });
  }, [orderedEntries, searchQuery, showDailySearch]);

  useContentPanelSidebarBreadcrumbs(sidebarBreadcrumbs, enabled);

  return (
    <div className="vault-folder-explorer">
      {showDailySearch ? (
        <div className="vault-folder-explorer-search">
          <input
            type="search"
            className="vault-folder-explorer-search-input"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search daily notes…"
            aria-label="Search daily notes"
          />
        </div>
      ) : null}
      {loading ? <p className="vault-folder-explorer-status">Loading…</p> : null}
      {error ? (
        <p className="vault-folder-explorer-status vault-folder-explorer-status-error">{error}</p>
      ) : null}

      {!loading && !error ? (
        filteredEntries.length > 0 ? (
          <ul className="vault-folder-explorer-list">
            {filteredEntries.map((entry) => {
              const whoopSnapshot =
                entry.kind === "file" && isDailyVaultNotePath(entry.path) && entry.date && entry.whoop
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
        ) : showDailySearch && searchQuery.trim().length > 0 ? (
          <p className="vault-folder-explorer-status">No notes match that search.</p>
        ) : (
          <p className="vault-folder-explorer-status">This folder is empty.</p>
        )
      ) : null}
    </div>
  );
}
