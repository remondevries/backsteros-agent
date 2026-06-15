import { useCallback, useEffect, useMemo, useState } from "react";
import { useLinearCustomers } from "../hooks/useLinearCustomers";
import { useLinearTeams } from "../hooks/useLinearTeams";
import type { LinearCustomerSummary, LinearTeamSummary } from "../lib/api";
import { groupByLetter } from "../lib/alphabeticalLetterGroups";
import {
  excludeWorkspaceSetupLinearTeams,
  workspaceSetupLinearTeamIdSet,
} from "../lib/workspaceSetupTeamIds";
import { useContentPanelBarState } from "../hooks/useContentPanelBarState";
import {
  contentListGroupHeaderId,
  contentListItemDataAttributes,
} from "../lib/contentListNavigation";
import {
  useContentListKeyboardFocusedId,
  useContentListKeyboardNavActive,
  useContentListNavigationRegistration,
} from "../lib/contentListNavigationReact";
import {
  useContentPanelSidebarBreadcrumbs,
  useContentPanelNavigation,
} from "./contentPanelNavigation";
import type { LinearSidebarTeamConfig } from "./sidebarNavConfig";
import {
  OrganizationsContentModeToggle,
  type OrganizationsContentMode,
} from "./OrganizationsContentModeToggle";
import { GroupChevron } from "./workspace-list/GroupChevron";
import { useCollapsibleGroups } from "./workspace-list/useCollapsibleGroups";

const ORGANIZATIONS_GROUP_PREFIX = "organizations";

function matchesSearchQuery(value: string, query: string): boolean {
  if (!query) return true;
  return value.toLocaleLowerCase().includes(query);
}

function customerSearchHaystack(customer: LinearCustomerSummary): string {
  return [customer.name, customer.slugId, customer.url, ...customer.domains]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

function teamSearchHaystack(team: LinearTeamSummary): string {
  return [team.name, team.key].filter(Boolean).join(" ").toLocaleLowerCase();
}

export function LinearOrganizationsExplorer({
  enabled,
  workspaceTeamConfig = {},
}: {
  enabled: boolean;
  workspaceTeamConfig?: LinearSidebarTeamConfig;
}) {
  const [contentMode, setContentMode] = useState<OrganizationsContentMode>("organizations");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const {
    linearSelection,
    setLinearSelection,
    clearActiveLinearDocument,
    clearActiveLinearIssue,
  } = useContentPanelNavigation();
  const { collapsedGroups, toggleGroup } = useCollapsibleGroups();
  const showingOrganizations = contentMode === "organizations";
  const selectedTeamId =
    showingOrganizations && linearSelection?.kind === "team" ? linearSelection.id : null;
  const teamsQuery = useLinearTeams(enabled && showingOrganizations);
  const customersQuery = useLinearCustomers(enabled && !showingOrganizations);
  const keyboardFocusedId = useContentListKeyboardFocusedId();
  const keyboardNavActive = useContentListKeyboardNavActive();

  const activeLoading = showingOrganizations ? teamsQuery.loading : customersQuery.loading;
  const activeRefreshing = showingOrganizations ? teamsQuery.refreshing : customersQuery.refreshing;
  const activeError = showingOrganizations ? teamsQuery.error : customersQuery.error;
  const activeCount = showingOrganizations ? teamsQuery.teams.length : customersQuery.customers.length;

  useContentPanelSidebarBreadcrumbs(
    useMemo(
      () => [
        {
          id: `organizations-view-${contentMode}`,
          label: showingOrganizations ? "Organizations" : "Customers",
        },
      ],
      [contentMode, showingOrganizations],
    ),
    enabled,
  );

  useContentPanelBarState({
    error: activeError,
    loading: enabled && activeLoading && activeCount === 0,
    loadingMessage: showingOrganizations ? "Loading organizations…" : "Loading customers…",
    refreshing: activeRefreshing,
    onRefresh: () => {
      if (showingOrganizations) {
        void teamsQuery.refresh({ background: true });
        return;
      }
      void customersQuery.refresh({ background: true });
    },
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim().toLocaleLowerCase());
    }, 200);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    if (showingOrganizations) return;
    if (linearSelection?.kind === "team") {
      setLinearSelection(null);
    }
  }, [linearSelection, setLinearSelection, showingOrganizations]);

  const excludedTeamIds = useMemo(
    () => workspaceSetupLinearTeamIdSet(workspaceTeamConfig),
    [workspaceTeamConfig],
  );

  const browseTeams = useMemo(
    () => excludeWorkspaceSetupLinearTeams(teamsQuery.teams, excludedTeamIds),
    [excludedTeamIds, teamsQuery.teams],
  );

  const filteredTeams = useMemo(() => {
    if (!debouncedSearchQuery) return browseTeams;
    return browseTeams.filter((team) =>
      matchesSearchQuery(teamSearchHaystack(team), debouncedSearchQuery),
    );
  }, [browseTeams, debouncedSearchQuery]);

  const filteredCustomers = useMemo(() => {
    if (!debouncedSearchQuery) return customersQuery.customers;
    return customersQuery.customers.filter((customer) =>
      matchesSearchQuery(customerSearchHaystack(customer), debouncedSearchQuery),
    );
  }, [customersQuery.customers, debouncedSearchQuery]);

  const teamLetterGroups = useMemo(
    () => groupByLetter(filteredTeams, (team) => team.name),
    [filteredTeams],
  );

  const customerLetterGroups = useMemo(
    () => groupByLetter(filteredCustomers, (customer) => customer.name),
    [filteredCustomers],
  );

  const letterGroups = showingOrganizations ? teamLetterGroups : customerLetterGroups;

  const selectTeam = useCallback(
    (team: LinearTeamSummary) => {
      clearActiveLinearDocument();
      clearActiveLinearIssue();
      setLinearSelection({ kind: "team", id: team.id, name: team.name });
    },
    [clearActiveLinearDocument, clearActiveLinearIssue, setLinearSelection],
  );

  const selectCustomer = useCallback((customerId: string) => {
    setSelectedCustomerId(customerId);
  }, []);

  const listNavItems = useMemo(() => {
    const items: Array<{ id: string; select: () => void }> = [];

    if (showingOrganizations) {
      for (const group of teamLetterGroups) {
        const groupHeaderId = contentListGroupHeaderId(ORGANIZATIONS_GROUP_PREFIX, group.key);
        items.push({
          id: groupHeaderId,
          select: () => toggleGroup(group.key),
        });

        if (!collapsedGroups.has(group.key)) {
          for (const team of group.items) {
            items.push({
              id: team.id,
              select: () => selectTeam(team),
            });
          }
        }
      }
      return items;
    }

    for (const group of customerLetterGroups) {
      const groupHeaderId = contentListGroupHeaderId(ORGANIZATIONS_GROUP_PREFIX, group.key);
      items.push({
        id: groupHeaderId,
        select: () => toggleGroup(group.key),
      });

      if (!collapsedGroups.has(group.key)) {
        for (const customer of group.items) {
          items.push({
            id: customer.id,
            select: () => selectCustomer(customer.id),
          });
        }
      }
    }

    return items;
  }, [
    collapsedGroups,
    customerLetterGroups,
    selectCustomer,
    selectTeam,
    showingOrganizations,
    teamLetterGroups,
    toggleGroup,
  ]);

  const selectedListId = showingOrganizations ? selectedTeamId : selectedCustomerId;

  useContentListNavigationRegistration({
    region: "sidebar",
    enabled: enabled && listNavItems.length > 0,
    items: listNavItems,
    selectedId: selectedListId,
  });

  const showList = enabled && !activeLoading && !activeError;
  const searchPlaceholder = showingOrganizations
    ? "Search organizations…"
    : "Search customers…";
  const searchAriaLabel = showingOrganizations
    ? "Search organizations"
    : "Search customers";
  const listAriaLabel = showingOrganizations ? "Organizations" : "Customers";
  const emptyMessage = showingOrganizations
    ? debouncedSearchQuery
      ? "No matching organizations."
      : "No organizations yet."
    : debouncedSearchQuery
      ? "No matching customers."
      : "No customers yet.";

  return (
    <div className="vault-folder-explorer">
      <div className="vault-folder-explorer-header">
        <OrganizationsContentModeToggle
          mode={contentMode}
          onChange={setContentMode}
          disabled={!enabled}
        />
      </div>
      <div className="vault-folder-explorer-search">
        <input
          type="search"
          className="vault-folder-explorer-search-input"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchAriaLabel}
          disabled={!enabled}
        />
      </div>
      {activeLoading ? <p className="vault-folder-explorer-status">Loading…</p> : null}
      {activeError ? (
        <p className="vault-folder-explorer-status vault-folder-explorer-status-error">{activeError}</p>
      ) : null}
      {showList ? (
        <ul className="vault-folder-explorer-list" aria-label={listAriaLabel}>
          {letterGroups.length > 0 ? (
            letterGroups.map((group) => {
              const groupHeaderId = contentListGroupHeaderId(ORGANIZATIONS_GROUP_PREFIX, group.key);
              const collapsed = collapsedGroups.has(group.key);

              return (
                <li key={group.key} className="vault-folder-explorer-week-group workspace-status-group">
                  <button
                    type="button"
                    {...contentListItemDataAttributes(groupHeaderId)}
                    className={[
                      "vault-folder-explorer-week-header",
                      "workspace-status-group__header",
                      keyboardNavActive && keyboardFocusedId === groupHeaderId
                        ? "vault-folder-explorer-entry-keyboard-focused"
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-expanded={!collapsed}
                    onClick={() => toggleGroup(group.key)}
                  >
                    <span className="workspace-status-group__chevron-slot" aria-hidden="true">
                      <GroupChevron expanded={!collapsed} />
                    </span>
                    <span className="sidebar-list-group-title">{group.label}</span>
                  </button>
                  {!collapsed ? (
                    <ul className="vault-folder-explorer-week-group-list">
                      {showingOrganizations
                        ? (group.items as LinearTeamSummary[]).map((team) => {
                            const selected = selectedTeamId === team.id;
                            return (
                              <li key={team.id} className="vault-folder-explorer-item">
                                <button
                                  type="button"
                                  {...contentListItemDataAttributes(team.id)}
                                  className={[
                                    "vault-folder-explorer-entry",
                                    "vault-folder-explorer-entry-file",
                                    selected ? "vault-folder-explorer-entry-selected" : null,
                                    keyboardNavActive && keyboardFocusedId === team.id
                                      ? "vault-folder-explorer-entry-keyboard-focused"
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                  onClick={() => selectTeam(team)}
                                >
                                  <span className="vault-folder-explorer-entry-name">{team.name}</span>
                                </button>
                              </li>
                            );
                          })
                        : (group.items as LinearCustomerSummary[]).map((customer) => {
                            const selected = selectedCustomerId === customer.id;
                            return (
                              <li key={customer.id} className="vault-folder-explorer-item">
                                <button
                                  type="button"
                                  {...contentListItemDataAttributes(customer.id)}
                                  className={[
                                    "vault-folder-explorer-entry",
                                    "vault-folder-explorer-entry-file",
                                    selected ? "vault-folder-explorer-entry-selected" : null,
                                    keyboardNavActive && keyboardFocusedId === customer.id
                                      ? "vault-folder-explorer-entry-keyboard-focused"
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                  onClick={() => selectCustomer(customer.id)}
                                >
                                  <span className="vault-folder-explorer-entry-name">{customer.name}</span>
                                </button>
                              </li>
                            );
                          })}
                    </ul>
                  ) : null}
                </li>
              );
            })
          ) : (
            <li className="vault-folder-explorer-item">
              <p className="vault-folder-explorer-status">{emptyMessage}</p>
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
