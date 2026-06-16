import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LinearIssueEntity } from "../chat/types";
import { createInboxDraftIssue } from "../lib/inboxDraftIssue";
import { linearSync, rollbackOptimisticIssueCreate } from "../lib/linearSync";
import { seedLinearIssueDetailFromEntity } from "../lib/linearIssueDetailSeed";
import { groupByLetter } from "../lib/alphabeticalLetterGroups";
import { useContentPanelBarState } from "../hooks/useContentPanelBarState";
import { useAutoOpenFirstListItem, useExplorerIosChrome } from "../hooks/useExplorerIosChrome";
import { useIosExplorerSearchChrome } from "../hooks/useIosExplorerSearchChrome";
import { useLinearTeamIssues } from "../hooks/useLinearTeamIssues";
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
  useContentPanelNavigation,
  useContentPanelSidebarBreadcrumbs,
} from "./contentPanelNavigation";
import { ProjectIssueRow } from "./project-issues/ProjectIssueRow";
import { requestLinearIssueViewMode } from "./project-issues/issueViewModeIntent";
import { GroupChevron } from "./workspace-list/GroupChevron";
import { useCollapsibleGroups } from "./workspace-list/useCollapsibleGroups";

const CONTACTS_GROUP_PREFIX = "contacts";

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M8 3.25v9.5M3.25 8h9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function matchesSearchQuery(value: string, query: string): boolean {
  if (!query) return true;
  return value.toLocaleLowerCase().includes(query);
}

export function LinearContactsExplorer({
  teamId,
  enabled,
}: {
  teamId: string;
  enabled: boolean;
}) {
  const { activeLinearIssue, setActiveLinearIssue, clearActiveLinearIssue } =
    useContentPanelNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const activeLinearIssueIdRef = useRef<string | null>(null);
  const { collapsedGroups, toggleGroup } = useCollapsibleGroups();
  const {
    issues,
    loading,
    refreshing,
    error,
    refresh,
    prependIssue,
  } = useLinearTeamIssues(teamId, enabled, {
    excludeCompleted: false,
    excludeSubIssues: true,
  });
  const keyboardFocusedId = useContentListKeyboardFocusedId();
  const keyboardNavActive = useContentListKeyboardNavActive();

  useContentPanelBarState({
    error,
    loading: enabled && loading && issues.length === 0,
    loadingMessage: "Loading contacts…",
    refreshing,
    onRefresh: refresh,
  });

  useContentPanelSidebarBreadcrumbs([], enabled);

  useEffect(() => {
    activeLinearIssueIdRef.current = activeLinearIssue?.id ?? null;
  }, [activeLinearIssue?.id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim().toLocaleLowerCase());
    }, 200);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const haystack = [issue.title, issue.identifier].filter(Boolean).join(" ");
      return matchesSearchQuery(haystack, debouncedSearchQuery);
    });
  }, [debouncedSearchQuery, issues]);

  const letterGroups = useMemo(
    () => groupByLetter(filteredIssues, (issue) => issue.title),
    [filteredIssues],
  );

  const openIssue = useCallback(
    (issue: LinearIssueEntity, mode: "issue" | "terminal" = "issue", options?: { freshCreate?: boolean }) => {
      seedLinearIssueDetailFromEntity(issue, { freshCreate: options?.freshCreate });
      if (mode === "terminal") {
        requestLinearIssueViewMode(issue.id, "terminal");
      }
      activeLinearIssueIdRef.current = issue.id;
      setActiveLinearIssue({
        id: issue.id,
        identifier: issue.identifier?.trim() || undefined,
        title: issue.title,
        status: issue.status,
        stateType: issue.stateType,
        projectName: issue.projectName?.trim() || undefined,
      });
    },
    [setActiveLinearIssue],
  );

  const firstVisibleIssue = useMemo(() => {
    for (const group of letterGroups) {
      if (collapsedGroups.has(group.key)) continue;
      const first = group.items[0];
      if (first) return first;
    }
    return letterGroups[0]?.items[0] ?? null;
  }, [collapsedGroups, letterGroups]);

  useAutoOpenFirstListItem({
    enabled,
    loading: enabled && loading && issues.length === 0,
    shouldOpen:
      Boolean(firstVisibleIssue) &&
      !(
        activeLinearIssue &&
        filteredIssues.some((issue) => issue.id === activeLinearIssue.id)
      ),
    onOpenFirst: () => openIssue(firstVisibleIssue!),
  });

  const handleCreateIssue = useCallback(() => {
    if (!enabled) return;

    setCreateError(null);
    const draft = createInboxDraftIssue();

    prependIssue(draft);
    openIssue(draft, "issue", { freshCreate: true });

    void linearSync.enqueueIssueCreate({
      kind: "team",
      teamId,
      localIssue: draft,
    }).catch((err) => {
      rollbackOptimisticIssueCreate(draft.id);
      if (activeLinearIssueIdRef.current === draft.id) {
        clearActiveLinearIssue();
      }
      setCreateError(err instanceof Error ? err.message : "Failed to create contact.");
    });
  }, [
    clearActiveLinearIssue,
    enabled,
    openIssue,
    prependIssue,
    teamId,
  ]);

  const listNavItems = useMemo(() => {
    const items: Array<{ id: string; select: () => void }> = [];

    for (const group of letterGroups) {
      const groupHeaderId = contentListGroupHeaderId(CONTACTS_GROUP_PREFIX, group.key);
      items.push({
        id: groupHeaderId,
        select: () => toggleGroup(group.key),
      });

      if (!collapsedGroups.has(group.key)) {
        for (const issue of group.items) {
          items.push({
            id: issue.id,
            select: () => openIssue(issue),
          });
        }
      }
    }

    return items;
  }, [collapsedGroups, letterGroups, openIssue, toggleGroup]);

  useContentListNavigationRegistration({
    region: "sidebar",
    enabled: enabled && listNavItems.length > 0,
    items: listNavItems,
    selectedId: activeLinearIssue?.id ?? null,
  });

  const showList = enabled && !loading && !error;

  useExplorerIosChrome(
    enabled
      ? [
          {
            id: "contacts-create",
            label: "New contact",
            onClick: () => {
              void handleCreateIssue();
            },
          },
        ]
      : null,
  );

  const { searchVisibleClassName } = useIosExplorerSearchChrome({
    enabled,
    label: "Search contacts",
    inputRef: searchInputRef,
  });

  return (
    <div className="vault-folder-explorer">
      <div
        className={["vault-folder-explorer-search", searchVisibleClassName]
          .filter(Boolean)
          .join(" ")}
      >
        <input
          ref={searchInputRef}
          type="search"
          className="vault-folder-explorer-search-input"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search contacts…"
          aria-label="Search contacts"
          disabled={!enabled}
        />
        <button
          type="button"
          className="vault-folder-explorer-add"
          onClick={() => {
            void handleCreateIssue();
          }}
          disabled={!enabled}
          aria-label="New contact"
          title="New contact"
        >
          <PlusIcon />
        </button>
      </div>
      {error ? (
        <p className="vault-folder-explorer-status vault-folder-explorer-status-error">{error}</p>
      ) : null}
      {createError ? (
        <p className="vault-folder-explorer-status vault-folder-explorer-status-error" role="alert">
          {createError}
        </p>
      ) : null}
      {showList ? (
        <ul className="vault-folder-explorer-list" aria-label="Contacts">
            {letterGroups.length > 0 ? (
              letterGroups.map((group) => {
                const groupHeaderId = contentListGroupHeaderId(CONTACTS_GROUP_PREFIX, group.key);
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
                      <span className="sidebar-list-group-count">{group.items.length}</span>
                    </button>
                    {!collapsed ? (
                      <ul className="vault-folder-explorer-week-group-list">
                        {group.items.map((issue) => (
                          <ProjectIssueRow
                            key={issue.id}
                            issue={issue}
                            grouped={false}
                            showMeta={false}
                            onClick={() => openIssue(issue)}
                            onTerminalIndicatorClick={() => openIssue(issue, "terminal")}
                          />
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })
            ) : (
              <li className="vault-folder-explorer-item">
                <p className="vault-folder-explorer-status">
                  {debouncedSearchQuery ? "No matching contacts." : "No contacts yet."}
                </p>
              </li>
            )}
          </ul>
      ) : null}
    </div>
  );
}
