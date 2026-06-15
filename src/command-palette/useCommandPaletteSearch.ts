import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import {
  fetchLinearProjectsPage,
  fetchLinearTeamProjects,
  fetchLinearTeams,
  fetchLinearCustomersPage,
  fetchVaultSearchIndex,
  searchLinearDocuments,
  searchLinearIssues,
  type VaultSearchIndexEntry,
} from "../lib/api";
import type { VaultNavItemId } from "../lib/vaultNavFolders";
import {
  applyAllModeInputChange,
  applyDocumentsModeInputChange,
  applyOrganizationsModeInputChange,
  applyProjectsModeInputChange,
  applyVaultFolderModeInputChange,
  createDefaultCommandPaletteFilterState,
  exitDocumentsFilterMode,
  exitOrganizationsFilterMode,
  exitProjectsFilterMode,
  exitVaultFolderFilterMode,
  isVaultFolderFilterMode,
  type CommandPaletteFilterMode,
  type CommandPaletteFilterState,
} from "./commandPaletteFilter";
import { vaultNavItemIdFromPath } from "./vaultNavFromPath";
import type { LinearSidebarTeamConfig } from "../app/sidebarNavConfig";
import { buildNavigationCommandItems } from "./navigationItems";
import {
  COMMAND_PALETTE_VAULT_FOLDER_FILTERS,
  commandPaletteSectionsForMode,
  type CommandPaletteItem,
  type CommandPaletteSection,
} from "./types";
import {
  applyCommandPaletteContextRanking,
  withTeamProjects,
  type CommandPaletteSearchContext,
} from "./commandPaletteSearchContext";

const SEARCH_DEBOUNCE_MS = 280;
const MAX_RESULTS_PER_SECTION = 20;

function linearTeamMatchesSearch(
  team: { name: string; key: string },
  query: string,
): boolean {
  const normalizedQuery = query.toLowerCase();
  return (
    team.name.toLowerCase().includes(normalizedQuery) ||
    team.key.toLowerCase().includes(normalizedQuery)
  );
}

function linearCustomerMatchesSearch(
  customer: { name: string; slugId?: string; domains: string[] },
  query: string,
): boolean {
  const normalizedQuery = query.toLowerCase();
  return (
    customer.name.toLowerCase().includes(normalizedQuery) ||
    (customer.slugId?.toLowerCase().includes(normalizedQuery) ?? false) ||
    customer.domains.some((domain) => domain.toLowerCase().includes(normalizedQuery))
  );
}

let cachedVaultSearchIndex: VaultSearchIndexEntry[] | null = null;

function vaultDocumentSection(navItemId: VaultNavItemId): "Inbox" | "KB" | null {
  if (navItemId === "inbox") return "Inbox";
  if (navItemId === "knowledge-base") return "KB";
  return null;
}

type CommandPaletteSearchState = {
  filterMode: CommandPaletteFilterMode;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  clearActiveFilter: () => void;
  groupedItems: Record<CommandPaletteSection, CommandPaletteItem[]>;
  activeSections: CommandPaletteSection[];
  loading: boolean;
  remoteError: string | null;
  reset: () => void;
};

export function useCommandPaletteSearch({
  enabled,
  vaultExplorerEnabled,
  linearSidebarTeamConfig,
  searchContext,
  isAdministrator = false,
}: {
  enabled: boolean;
  vaultExplorerEnabled: boolean;
  linearSidebarTeamConfig?: LinearSidebarTeamConfig;
  searchContext: CommandPaletteSearchContext | null;
  isAdministrator?: boolean;
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
  const [teamProjects, setTeamProjects] = useState<Array<{ id: string; name: string }>>([]);
  const requestIdRef = useRef(0);
  const teamProjectsRequestIdRef = useRef(0);

  const { mode: filterMode, searchTerm } = filterState;
  const activeSections = useMemo(
    () => commandPaletteSectionsForMode(filterMode),
    [filterMode],
  );

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

  const teamContextKey =
    searchContext?.kind === "linear-team" ? `${searchContext.teamId}:${searchContext.teamName}` : null;

  useEffect(() => {
    if (!enabled || !teamContextKey || searchContext?.kind !== "linear-team") {
      setTeamProjects([]);
      return;
    }

    const teamId = searchContext.teamId;
    const requestId = ++teamProjectsRequestIdRef.current;
    void fetchLinearTeamProjects(teamId)
      .then((result) => {
        if (requestId !== teamProjectsRequestIdRef.current) return;
        setTeamProjects(result.projects ?? []);
      })
      .catch(() => {
        if (requestId !== teamProjectsRequestIdRef.current) return;
        setTeamProjects([]);
      });

    return () => {
      teamProjectsRequestIdRef.current += 1;
    };
  }, [enabled, searchContext, teamContextKey]);

  const effectiveSearchContext = useMemo(() => {
    if (filterMode !== "all" || !searchContext) return null;
    if (searchContext.kind !== "linear-team") return searchContext;
    return withTeamProjects(searchContext, teamProjects);
  }, [filterMode, searchContext, teamProjects]);

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
    if (filterMode !== "all") return [];
    return buildNavigationCommandItems(debouncedSearchTerm, {
      isAdministrator,
      linearSidebarTeamConfig,
    });
  }, [debouncedSearchTerm, filterMode, isAdministrator, linearSidebarTeamConfig]);

  const vaultItems = useMemo(() => {
    if (filterMode !== "all") return [];
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

  const vaultDocumentItems = useMemo(() => {
    if (filterMode !== "documents") return [];
    if (!vaultExplorerEnabled || !vaultFuse || !debouncedSearchTerm) return [];

    const inbox: CommandPaletteItem[] = [];
    const kb: CommandPaletteItem[] = [];

    for (const { item: entry } of vaultFuse.search(debouncedSearchTerm)) {
      const navItemId = vaultNavItemIdFromPath(entry.path);
      if (!navItemId) continue;

      const section = vaultDocumentSection(navItemId);
      if (!section) continue;

      const bucket = section === "Inbox" ? inbox : kb;
      if (bucket.length >= MAX_RESULTS_PER_SECTION) continue;

      bucket.push({
        kind: "vault-note",
        id: entry.path,
        section,
        label: entry.title,
        subtitle: entry.path,
        path: entry.path,
        title: entry.title,
        navItemId,
      });
    }

    return [...inbox, ...kb];
  }, [debouncedSearchTerm, filterMode, vaultExplorerEnabled, vaultFuse]);

  const vaultFolderFilterItems = useMemo(() => {
    if (!isVaultFolderFilterMode(filterMode)) return [];
    if (!vaultExplorerEnabled || !vaultFuse || !debouncedSearchTerm) return [];

    const { navItemId, section } = COMMAND_PALETTE_VAULT_FOLDER_FILTERS[filterMode];
    const items: CommandPaletteItem[] = [];

    for (const { item: entry } of vaultFuse.search(debouncedSearchTerm)) {
      if (vaultNavItemIdFromPath(entry.path) !== navItemId) continue;
      if (items.length >= MAX_RESULTS_PER_SECTION) break;

      items.push({
        kind: "vault-note",
        id: entry.path,
        section,
        label: entry.title,
        subtitle: entry.path,
        path: entry.path,
        title: entry.title,
        navItemId,
      });
    }

    return items;
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

    if (isVaultFolderFilterMode(filterMode)) {
      setRemoteItems([]);
      setRemoteError(null);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setRemoteError(null);

    const projectsOnly = filterMode === "projects";
    const documentsOnly = filterMode === "documents";
    const organizationsOnly = filterMode === "organizations";

    const remoteRequest = projectsOnly
      ? fetchLinearProjectsPage({ query: debouncedSearchTerm, first: MAX_RESULTS_PER_SECTION }).catch(
          (error) => ({
            projects: [] as Awaited<ReturnType<typeof fetchLinearProjectsPage>>["projects"],
            error: error instanceof Error ? error.message : "Failed to search Linear projects",
          }),
        )
      : documentsOnly
        ? searchLinearDocuments(debouncedSearchTerm, { limit: MAX_RESULTS_PER_SECTION }).catch(
            (error) => ({
              documents: [] as Awaited<ReturnType<typeof searchLinearDocuments>>["documents"],
              error: error instanceof Error ? error.message : "Failed to search Linear documents",
            }),
          )
        : organizationsOnly
          ? fetchLinearCustomersPage({ query: debouncedSearchTerm, first: MAX_RESULTS_PER_SECTION }).catch(
              (error) => ({
                customers: [] as Awaited<ReturnType<typeof fetchLinearCustomersPage>>["customers"],
                error: error instanceof Error ? error.message : "Failed to search Linear customers",
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
          ]);

    void remoteRequest
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

        if (documentsOnly) {
          const documentResult = result as Awaited<ReturnType<typeof searchLinearDocuments>> & {
            error?: string;
          };
          setRemoteError(
            "error" in documentResult && documentResult.error ? documentResult.error : null,
          );
          const documentItems: CommandPaletteItem[] = (documentResult.documents ?? []).map(
            (document) => ({
              kind: "linear-document",
              id: document.id,
              section: "Linear documents",
              label: document.title,
              subtitle: document.projectName,
              documentId: document.id,
              title: document.title,
              projectId: document.projectId,
              projectName: document.projectName,
            }),
          );
          setRemoteItems(documentItems);
          return;
        }

        if (organizationsOnly) {
          const customerResult = result as Awaited<ReturnType<typeof fetchLinearCustomersPage>> & {
            error?: string;
          };
          setRemoteError(
            "error" in customerResult && customerResult.error ? customerResult.error : null,
          );
          const customerItems: CommandPaletteItem[] = (customerResult.customers ?? [])
            .filter((customer) => linearCustomerMatchesSearch(customer, debouncedSearchTerm))
            .slice(0, MAX_RESULTS_PER_SECTION)
            .map((customer) => ({
              kind: "linear-customer",
              id: customer.id,
              section: "Organizations",
              label: customer.name,
              subtitle: customer.domains[0] ?? customer.slugId,
              customerId: customer.id,
              customerName: customer.name,
            }));
          setRemoteItems(customerItems);
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
      activeSections.map((section) => [section, [] as CommandPaletteItem[]]),
    ) as Record<CommandPaletteSection, CommandPaletteItem[]>;

    if (filterMode === "all") {
      for (const item of navigationItems.slice(0, MAX_RESULTS_PER_SECTION)) {
        grouped.Navigate.push(item);
      }

      for (const item of vaultItems) {
        grouped.Notes.push(item);
      }
    }

    if (filterMode === "documents") {
      for (const item of vaultDocumentItems) {
        grouped[item.section].push(item);
      }
    }

    if (isVaultFolderFilterMode(filterMode)) {
      const section = COMMAND_PALETTE_VAULT_FOLDER_FILTERS[filterMode].section;
      for (const item of vaultFolderFilterItems) {
        grouped[section].push(item);
      }
    }

    for (const item of remoteItems) {
      grouped[item.section].push(item);
    }

    if (filterMode === "all" && effectiveSearchContext) {
      return applyCommandPaletteContextRanking(grouped, effectiveSearchContext);
    }

    return grouped;
  }, [
    activeSections,
    effectiveSearchContext,
    filterMode,
    navigationItems,
    remoteItems,
    vaultDocumentItems,
    vaultFolderFilterItems,
    vaultItems,
  ]);

  const setSearchTerm = useCallback((value: string) => {
    setFilterState((current) => {
      const next =
        current.mode === "projects"
          ? applyProjectsModeInputChange(value, current)
          : current.mode === "documents"
            ? applyDocumentsModeInputChange(value, current)
            : current.mode === "organizations"
              ? applyOrganizationsModeInputChange(value, current)
              : isVaultFolderFilterMode(current.mode)
                ? applyVaultFolderModeInputChange(value, current)
                : applyAllModeInputChange(value, current);
      return next ?? current;
    });
  }, []);

  const clearActiveFilter = useCallback(() => {
    setFilterState((current) => {
      if (current.mode === "projects") {
        return exitProjectsFilterMode(current) ?? current;
      }
      if (current.mode === "documents") {
        return exitDocumentsFilterMode(current) ?? current;
      }
      if (current.mode === "organizations") {
        return exitOrganizationsFilterMode(current) ?? current;
      }
      if (isVaultFolderFilterMode(current.mode)) {
        return exitVaultFolderFilterMode(current) ?? current;
      }
      return current;
    });
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
    clearActiveFilter,
    groupedItems,
    activeSections,
    loading,
    remoteError,
    reset,
  };
}
