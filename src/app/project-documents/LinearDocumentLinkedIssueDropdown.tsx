import { useCallback, useEffect, useMemo, useState } from "react";
import type { LinearIssueEntity } from "../../chat/types";
import { searchLinearIssues } from "../../lib/api";
import { LinearStatusIcon } from "../../chat/LinearStatusIcon";
import { LinearIssueDetailsPropertyDropdown } from "../project-issues/LinearIssueDetailsPropertyDropdown";
import type { SearchableDropdownOption } from "../ui/SearchableDropdown";
import { searchableDropdownShortcut } from "../ui/searchableDropdownShortcuts";

const NO_ISSUE_VALUE = "__no_issue__";

function LinearIssueLinkIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M6.5 2.75a3.25 3.25 0 0 0-2.3 5.53l4.45 4.45a2.25 2.25 0 0 0 3.18-3.18L7.38 5.1a.75.75 0 1 1 1.06-1.06l4.45 4.45a3.75 3.75 0 1 1-5.3-5.3L3.2 7.13a4.75 4.75 0 1 0 6.72 6.72l4.45-4.45a.75.75 0 0 1 1.06 1.06l-4.45 4.45A6.25 6.25 0 1 1 2.14 8.19L6.5 3.81a4.75 4.75 0 0 0 3.36 8.06.75.75 0 1 1-.84 1.24A6.24 6.24 0 0 1 6.5 2.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

function issueToOption(issue: LinearIssueEntity, index: number): SearchableDropdownOption {
  const identifier = issue.identifier?.trim() || issue.id;
  const label = issue.identifier ? `${issue.identifier} · ${issue.title}` : issue.title;
  return {
    value: issue.id,
    label,
    icon: issue.status ? (
      <LinearStatusIcon status={issue.status} stateType={issue.stateType} title={issue.status} />
    ) : (
      <LinearIssueLinkIcon />
    ),
    searchTerms: `${identifier} ${issue.title}`,
    shortcut: searchableDropdownShortcut(index),
  };
}

export function LinearDocumentLinkedIssueDropdown({
  issueIdentifier,
  disabled = false,
  onLinkIssue,
  onClearIssue,
}: {
  issueIdentifier: string | null;
  disabled?: boolean;
  onLinkIssue: (issue: LinearIssueEntity) => void;
  onClearIssue: () => void;
}) {
  const [options, setOptions] = useState<SearchableDropdownOption[]>(() => [
    {
      value: NO_ISSUE_VALUE,
      label: "No linked issue",
      icon: <LinearIssueLinkIcon />,
      shortcut: searchableDropdownShortcut(0),
    },
  ]);
  const [issueById, setIssueById] = useState<Map<string, LinearIssueEntity>>(() => new Map());
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadIssues = useCallback(async (term: string) => {
    setLoading(true);
    try {
      const result = await searchLinearIssues(term, { limit: 20 });
      setIssueById((current) => {
        const next = new Map(current);
        for (const issue of result.issues) {
          next.set(issue.id, issue);
        }
        return next;
      });

      const issueOptions = result.issues.map((issue, index) => issueToOption(issue, index + 1));
      setOptions([
        {
          value: NO_ISSUE_VALUE,
          label: "No linked issue",
          icon: <LinearIssueLinkIcon />,
          shortcut: searchableDropdownShortcut(0),
        },
        ...issueOptions,
      ]);

      if (issueIdentifier) {
        const matched = result.issues.find(
          (issue) =>
            issue.identifier?.trim().toUpperCase() === issueIdentifier.trim().toUpperCase(),
        );
        setSelectedIssueId(matched?.id ?? null);
      }
    } catch {
      setOptions([
        {
          value: NO_ISSUE_VALUE,
          label: "No linked issue",
          icon: <LinearIssueLinkIcon />,
          shortcut: searchableDropdownShortcut(0),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [issueIdentifier]);

  useEffect(() => {
    if (!issueIdentifier) {
      setSelectedIssueId(null);
      return;
    }
    void loadIssues(issueIdentifier);
  }, [issueIdentifier, loadIssues]);

  const dropdownValue = selectedIssueId ?? (issueIdentifier ? null : NO_ISSUE_VALUE);

  const fallbackLabel = useMemo(() => {
    if (!issueIdentifier) {
      return loading ? "Loading issues…" : "No linked issue";
    }
    const selected = selectedIssueId
      ? options.find((option) => option.value === selectedIssueId)
      : null;
    if (selected) return selected.label;
    return issueIdentifier;
  }, [issueIdentifier, loading, options, selectedIssueId]);

  const handleChange = useCallback(
    (value: string) => {
      if (value === NO_ISSUE_VALUE) {
        onClearIssue();
        setSelectedIssueId(null);
        return;
      }

      const issue = issueById.get(value);
      if (!issue) return;
      setSelectedIssueId(issue.id);
      onLinkIssue(issue);
    },
    [issueById, onClearIssue, onLinkIssue],
  );

  const handleQuerySubmit = useCallback(
    (query: string) => {
      void loadIssues(query);
      return false;
    },
    [loadIssues],
  );

  return (
    <LinearIssueDetailsPropertyDropdown
      value={dropdownValue}
      options={options}
      onChange={handleChange}
      disabled={disabled}
      searchPlaceholder="Search issues…"
      searchShortcutLabel="I"
      ariaLabel="Link Linear issue"
      onQuerySubmit={handleQuerySubmit}
      registerOpenMenu={(open) =>
        open
          ? () => {
              void loadIssues(issueIdentifier ?? "");
              open();
            }
          : null
      }
      fallbackIcon={<LinearIssueLinkIcon />}
      fallbackLabel={fallbackLabel}
    />
  );
}
