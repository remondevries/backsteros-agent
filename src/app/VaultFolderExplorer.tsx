import { useMemo, useState } from "react";
import { vaultNavItemLabel, type VaultNavItemId } from "../lib/vaultNavFolders";
import { useVaultDirectory } from "../hooks/useVaultDirectory";
import { useContentPanelSidebarBreadcrumbs } from "./contentPanelNavigation";

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
  const rootPath = vaultNavItemLabel(activeNavItem);
  const [relativePath, setRelativePath] = useState<string>(rootPath);

  const { entries, loading, error } = useVaultDirectory(relativePath, enabled);

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
            {entries.map((entry) => (
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
                  <div className="vault-folder-explorer-entry vault-folder-explorer-entry-file">
                    <span className="vault-folder-explorer-entry-name">{entry.name}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="vault-folder-explorer-status">This folder is empty.</p>
        )
      ) : null}
    </div>
  );
}
