import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import {
  fetchLinearProjectsPage,
  fetchVaultSearchIndex,
  searchLinearIssues,
  type VaultSearchIndexEntry,
} from "../lib/api";
import { vaultNavItemIdFromPath } from "./vaultNavFromPath";
import { buildNavigationCommandItems } from "./navigationItems";
import {
  COMMAND_PALETTE_SECTIONS,
  type CommandPaletteItem,
  type CommandPaletteSection,
} from "./types";

const SEARCH_DEBOUNCE_MS = 280;
const MAX_RESULTS_PER_SECTION = 20;

type CommandPaletteSearchState = {
  query: string;
  setQuery: (value: string) => void;
  groupedItems: Record<CommandPaletteSection, CommandPaletteItem[]>;
  loading: boolean;
  reset: () => void;
};

export function useCommandPaletteSearch({
  enabled,
  vaultExplorerEnabled,
}: {
  enabled: boolean;
  vaultExplorerEnabled: boolean;
}): CommandPaletteSearchState {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [remoteItems, setRemoteItems] = useState<CommandPaletteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [vaultIndex, setVaultIndex] = useState<VaultSearchIndexEntry[]>([]);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    if (!enabled || !vaultExplorerEnabled) {
      setVaultIndex([]);
      return;
    }

    let cancelled = false;
    void fetchVaultSearchIndex()
      .then((result) => {
        if (!cancelled) {
          setVaultIndex(result.entries ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVaultIndex([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, vaultExplorerEnabled]);

  const vaultFuse = useMemo(
    () =>
      vaultIndex.length > 0
        ? new Fuse(vaultIndex, {
            keys: [
              { name: "title", weight: 0.55 },
              { name: "path", weight: 0.3 },
              { name: "folder", weight: 0.15 },
            ],
            threshold: 0.38,
            ignoreLocation: true,
            minMatchCharLength: 1,
          })
        : null,
    [vaultIndex],
  );

  const navigationItems = useMemo(
    () => buildNavigationCommandItems(debouncedQuery),
    [debouncedQuery],
  );

  const vaultItems = useMemo(() => {
    if (!vaultExplorerEnabled || !vaultFuse || !debouncedQuery) return [];

    return vaultFuse
      .search(debouncedQuery, { limit: MAX_RESULTS_PER_SECTION })
      .map(({ item }) => item)
      .map((entry): CommandPaletteItem | null => {
        const navItemId = vaultNavItemIdFromPath(entry.path);
        if (!navItemId) return null;
        return {
          kind: "vault-note",
          id: entry.path,
          section: "Notes",
          label: entry.title,
          subtitle: entry.path,
          path: entry.path,
          title: entry.title,
          navItemId,
        };
      })
      .filter((item): item is CommandPaletteItem => item !== null);
  }, [debouncedQuery, vaultExplorerEnabled, vaultFuse]);

  useEffect(() => {
    if (!enabled) {
      setRemoteItems([]);
      setLoading(false);
      return;
    }

    if (!debouncedQuery) {
      setRemoteItems([]);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);

    void Promise.all([
      searchLinearIssues(debouncedQuery, { limit: MAX_RESULTS_PER_SECTION }).catch(() => ({
        issues: [] as Awaited<ReturnType<typeof searchLinearIssues>>["issues"],
        error: undefined,
      })),
      fetchLinearProjectsPage({ query: debouncedQuery, first: MAX_RESULTS_PER_SECTION }).catch(
        () => ({
          projects: [] as Awaited<ReturnType<typeof fetchLinearProjectsPage>>["projects"],
        }),
      ),
    ])
      .then(([issueResult, projectResult]) => {
        if (requestId !== requestIdRef.current) return;

        const issueItems: CommandPaletteItem[] = (issueResult.issues ?? []).map((issue) => ({
          kind: "linear-issue",
          id: issue.id,
          section: "Issues",
          label: issue.identifier ? `${issue.identifier} · ${issue.title}` : issue.title,
          subtitle: [issue.status, issue.projectName].filter(Boolean).join(" · ") || undefined,
          issue,
        }));

        const projectItems: CommandPaletteItem[] = (projectResult.projects ?? []).map(
          (project) => ({
            kind: "linear-project",
            id: project.id,
            section: "Projects",
            label: project.name,
            subtitle: project.status?.name,
            projectId: project.id,
            projectName: project.name,
          }),
        );

        setRemoteItems([...issueItems, ...projectItems]);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      });
  }, [debouncedQuery, enabled]);

  const groupedItems = useMemo(() => {
    const grouped = Object.fromEntries(
      COMMAND_PALETTE_SECTIONS.map((section) => [section, [] as CommandPaletteItem[]]),
    ) as Record<CommandPaletteSection, CommandPaletteItem[]>;

    for (const item of navigationItems.slice(0, MAX_RESULTS_PER_SECTION)) {
      grouped.Navigate.push(item);
    }

    for (const item of vaultItems) {
      grouped.Notes.push(item);
    }

    for (const item of remoteItems) {
      grouped[item.section].push(item);
    }

    return grouped;
  }, [navigationItems, remoteItems, vaultItems]);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setQuery("");
    setDebouncedQuery("");
    setRemoteItems([]);
    setLoading(false);
  }, []);

  return {
    query,
    setQuery,
    groupedItems,
    loading,
    reset,
  };
}
