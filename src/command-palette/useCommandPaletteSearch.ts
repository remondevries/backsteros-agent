import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import {
  fetchLinearProjectsPage,
  fetchVaultSearchIndex,
  searchLinearIssues,
  type VaultSearchIndexEntry,
} from "../lib/api";
import {
  applyAllModeInputChange,
  applyProjectsModeInputChange,
  createDefaultCommandPaletteFilterState,
  exitProjectsFilterMode,
  type CommandPaletteFilterMode,
  type CommandPaletteFilterState,
} from "./commandPaletteFilter";
import { vaultNavItemIdFromPath } from "./vaultNavFromPath";
import { buildNavigationCommandItems } from "./navigationItems";
import {
  COMMAND_PALETTE_SECTIONS,
  type CommandPaletteItem,
  type CommandPaletteSection,
} from "./types";

const SEARCH_DEBOUNCE_MS = 280;
const MAX_RESULTS_PER_SECTION = 20;

let cachedVaultSearchIndex: VaultSearchIndexEntry[] | null = null;

type CommandPaletteSearchState = {
  filterMode: CommandPaletteFilterMode;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  clearProjectsFilter: () => void;
  groupedItems: Record<CommandPaletteSection, CommandPaletteItem[]>;
  loading: boolean;
  remoteError: string | null;
  reset: () => void;
};

export function useCommandPaletteSearch({
  enabled,
  vaultExplorerEnabled,
}: {
  enabled: boolean;
  vaultExplorerEnabled: boolean;
}): CommandPaletteSearchState {
  const [filterState, setFilterState] = useState<CommandPaletteFilterState>(
    createDefaultCommandPaletteFilterState,
  );
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [remoteItems, setRemoteItems] = useState<CommandPaletteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [vaultIndex, setVaultIndex] = useState<VaultSearchIndexEntry[]>(
    () => cachedVaultSearchIndex ?? [],
  );
  const requestIdRef = useRef(0);

  const { mode: filterMode, searchTerm } = filterState;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    if (!enabled || !vaultExplorerEnabled) {
      return;
    }

    if (cachedVaultSearchIndex) {
      setVaultIndex(cachedVaultSearchIndex);
      return;
    }

    let cancelled = false;
    void fetchVaultSearchIndex()
      .then((result) => {
        if (cancelled) return;
        cachedVaultSearchIndex = result.entries ?? [];
        setVaultIndex(cachedVaultSearchIndex);
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

  const navigationItems = useMemo(() => {
    if (filterMode === "projects") return [];
    return buildNavigationCommandItems(debouncedSearchTerm);
  }, [debouncedSearchTerm, filterMode]);

  const vaultItems = useMemo(() => {
    if (filterMode === "projects") return [];
    if (!vaultExplorerEnabled || !vaultFuse || !debouncedSearchTerm) return [];

    return vaultFuse
      .search(debouncedSearchTerm, { limit: MAX_RESULTS_PER_SECTION })
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
  }, [debouncedSearchTerm, filterMode, vaultExplorerEnabled, vaultFuse]);

  useEffect(() => {
    if (!enabled) {
      setRemoteItems([]);
      setRemoteError(null);
      setLoading(false);
      return;
    }

    if (!debouncedSearchTerm) {
      setRemoteItems([]);
      setRemoteError(null);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setRemoteError(null);

    const projectsOnly = filterMode === "projects";

    void (projectsOnly
      ? fetchLinearProjectsPage({ query: debouncedSearchTerm, first: MAX_RESULTS_PER_SECTION }).catch(
          (error) => ({
            projects: [] as Awaited<ReturnType<typeof fetchLinearProjectsPage>>["projects"],
            error: error instanceof Error ? error.message : "Failed to search Linear projects",
          }),
        )
      : Promise.all([
          searchLinearIssues(debouncedSearchTerm, { limit: MAX_RESULTS_PER_SECTION }).catch(
            (error) => ({
              issues: [] as Awaited<ReturnType<typeof searchLinearIssues>>["issues"],
              error: error instanceof Error ? error.message : "Failed to search Linear issues",
            }),
          ),
          fetchLinearProjectsPage({ query: debouncedSearchTerm, first: MAX_RESULTS_PER_SECTION }).catch(
            (error) => ({
              projects: [] as Awaited<ReturnType<typeof fetchLinearProjectsPage>>["projects"],
              error: error instanceof Error ? error.message : "Failed to search Linear projects",
            }),
          ),
        ]))
      .then((result) => {
        if (requestId !== requestIdRef.current) return;

        if (projectsOnly) {
          const projectResult = result as Awaited<ReturnType<typeof fetchLinearProjectsPage>> & {
            error?: string;
          };
          setRemoteError(
            "error" in projectResult && projectResult.error ? projectResult.error : null,
          );
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
          setRemoteItems(projectItems);
          return;
        }

        const [issueResult, projectResult] = result as [
          Awaited<ReturnType<typeof searchLinearIssues>> & { error?: string },
          Awaited<ReturnType<typeof fetchLinearProjectsPage>> & { error?: string },
        ];

        const errors = [
          "error" in issueResult ? issueResult.error : undefined,
          "error" in projectResult ? projectResult.error : undefined,
        ].filter((message): message is string => Boolean(message));
        setRemoteError(errors[0] ?? null);

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

        setRemoteItems([...projectItems, ...issueItems]);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      });
  }, [debouncedSearchTerm, enabled, filterMode]);

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

  const setSearchTerm = useCallback((value: string) => {
    setFilterState((current) => {
      const next =
        current.mode === "projects"
          ? applyProjectsModeInputChange(value, current)
          : applyAllModeInputChange(value, current);
      return next ?? current;
    });
  }, []);

  const clearProjectsFilter = useCallback(() => {
    setFilterState((current) => exitProjectsFilterMode(current) ?? current);
  }, []);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setFilterState(createDefaultCommandPaletteFilterState());
    setDebouncedSearchTerm("");
    setRemoteItems([]);
    setRemoteError(null);
    setLoading(false);
  }, []);

  return {
    filterMode,
    searchTerm,
    setSearchTerm,
    clearProjectsFilter,
    groupedItems,
    loading,
    remoteError,
    reset,
  };
}
