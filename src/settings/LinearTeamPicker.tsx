import { useEffect, useId, useRef, useState } from "react";
import { RefreshIcon } from "../app/RefreshIcon";
import type { LinearTeamSummary } from "../lib/api";
import {
  resolveLinearTeam,
} from "../lib/linearTeamDisplay";
import { PickerSearchField } from "./PickerSearchField";
import { SettingsPickerOptionRow } from "./SettingsPickerBadge";

function filterTeams(teams: LinearTeamSummary[], query: string): LinearTeamSummary[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return teams;

  return teams.filter((team) => {
    const haystack = `${team.name} ${team.key}`.toLowerCase();
    return haystack.includes(normalized);
  });
}

export function LinearTeamPicker({
  value,
  onChange,
  teams,
  loading = false,
  disabled,
  id,
  placeholder = "Select a team…",
  searchPlaceholder = "Search teams…",
  loadingLabel = "Loading...",
}: {
  value: string;
  onChange: (teamId: string) => void;
  teams: LinearTeamSummary[];
  loading?: boolean;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  loadingLabel?: string;
}) {
  const fallbackId = useId();
  const fieldId = id ?? fallbackId;
  const searchFieldId = `${fieldId}-search`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const resolvedTeam = resolveLinearTeam(value, teams);
  const filteredTeams = filterTeams(teams, search);
  const teamsUnavailable = teams.length === 0 && !loading;
  const pickerDisabled = disabled || loading || teamsUnavailable;
  const hasSelection = Boolean(value.trim());
  const triggerLabel = loading
    ? null
    : resolvedTeam
      ? resolvedTeam.name
      : hasSelection
        ? "Saved team"
        : placeholder;
  const triggerBadge = loading
    ? null
    : resolvedTeam
      ? resolvedTeam.key
      : hasSelection
        ? value
        : null;

  function closePanel() {
    setOpen(false);
    setSearch("");
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        closePanel();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function handleSelect(team: LinearTeamSummary) {
    onChange(team.id);
    closePanel();
  }

  return (
    <div
      ref={rootRef}
      className={`linear-project-picker settings-option-picker ${open ? "linear-project-picker--open" : ""}`}
    >
      <button
        type="button"
        id={fieldId}
        className="linear-project-picker-trigger"
        disabled={pickerDisabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-busy={loading || undefined}
        onClick={() => {
          if (pickerDisabled) return;
          setOpen((current) => !current);
        }}
      >
        {loading ? (
          <span
            className="linear-project-picker-trigger-placeholder linear-project-picker-trigger-loading"
            role="status"
          >
            <RefreshIcon spinning />
            <span>{loadingLabel}</span>
          </span>
        ) : (
          triggerBadge ? (
            <SettingsPickerOptionRow label={triggerLabel} badge={triggerBadge} />
          ) : (
            <span
              className={
                hasSelection
                  ? "linear-project-picker-trigger-label"
                  : "linear-project-picker-trigger-placeholder"
              }
            >
              {triggerLabel}
            </span>
          )
        )}
        <span className="linear-project-picker-trigger-caret" aria-hidden="true" />
      </button>

      {open && (
        <div className="linear-project-picker-panel" role="presentation">
          <PickerSearchField
            id={searchFieldId}
            value={search}
            placeholder={searchPlaceholder}
            ariaLabel={searchPlaceholder}
            onChange={setSearch}
            autoFocus
          />
          <div
            className="linear-project-picker-list settings-option-picker-list"
            role="listbox"
            aria-labelledby={fieldId}
          >
            {filteredTeams.length === 0 ? (
              <p className="linear-project-picker-status">
                {search.trim() ? "No matches found." : "No teams available."}
              </p>
            ) : (
              filteredTeams.map((team) => {
                const isSelected = team.id === value;
                return (
                  <button
                    key={team.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={[
                      "linear-project-picker-option",
                      "settings-option-picker-option",
                      isSelected ? "linear-project-picker-option--selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => handleSelect(team)}
                  >
                    <SettingsPickerOptionRow label={team.name} badge={team.key} />
                    {isSelected && (
                      <span className="linear-project-picker-option-check" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
