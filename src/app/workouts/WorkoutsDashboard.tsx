import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WorkoutGroupSetEntity } from "../../lib/api";
import { useContentPanelBarState } from "../../hooks/useContentPanelBarState";
import { useExplorerIosChrome } from "../../hooks/useExplorerIosChrome";
import { useIosExplorerSearchChrome } from "../../hooks/useIosExplorerSearchChrome";
import { useLinearTeamProjects } from "../../hooks/useLinearTeamProjects";
import { useLinearWorkoutMilestones } from "../../hooks/useLinearWorkoutMilestones";
import { useWorkoutDashboardSessions } from "../../hooks/useWorkoutDashboardSessions";
import { todayIso } from "../../lib/dateFormat";
import {
  formatGroupSetTotalWeightKg,
  sumGroupSetWeightKg,
  sumGroupSetRepCount,
  sumSessionGroupSetWeightKg,
} from "../../lib/workouts/workoutRepDisplay";
import { formatWorkoutDayLabel } from "../../lib/workouts/workoutsBreadcrumb";
import {
  groupWorkoutMilestonesForPeriodView,
  workoutMilestoneDateKey,
} from "../../lib/workouts/workoutMilestoneGroups";
import { defaultWorkoutYearProjectId } from "../../lib/workouts/workoutYearProjects";
import { workoutsDayPath } from "../../lib/workouts/workoutDays";
import { useContentPanelNavigation } from "../contentPanelNavigation";
import { GroupChevron } from "../workspace-list/GroupChevron";
import { useWorkoutsPeriodView } from "./WorkoutsPeriodViewContext";
import { WorkoutRepSummaryRow } from "./WorkoutRepSummaryRow";
import { WorkoutsYearPicker } from "./WorkoutsYearPicker";
import { WorkoutRepsIcon } from "./WorkoutRepsIcon";
import { useWorkoutsDashboardGraphCollapsed } from "./WorkoutsDashboardScrollContext";
import type { WorkoutMilestoneEntity } from "../../lib/workouts/workoutMilestoneGroups";
import type { WorkoutSessionEntity } from "../../lib/api";

function workoutMilestoneMatchesSearch(
  milestone: WorkoutMilestoneEntity,
  query: string,
  session: WorkoutSessionEntity | undefined,
): boolean {
  const dateKey = workoutMilestoneDateKey(milestone);
  if (!dateKey) return false;
  const label = formatWorkoutDayLabel(dateKey).toLowerCase();
  if (label.includes(query)) return true;
  if (dateKey.includes(query)) return true;
  const milestoneName = milestone.name?.trim().toLowerCase() ?? "";
  if (milestoneName.includes(query)) return true;
  for (const groupSet of session?.groupSets ?? []) {
    const exercise = (groupSet.exercise?.trim() || groupSet.title.trim()).toLowerCase();
    if (exercise.includes(query)) return true;
  }
  return false;
}

function WorkoutDashboardGroupSetRow({
  groupSet,
  expanded,
  onToggleExpanded,
}: {
  groupSet: WorkoutGroupSetEntity;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const exercise = groupSet.exercise?.trim() || groupSet.title.trim() || "Untitled";
  const totalWeightLabel = formatGroupSetTotalWeightKg(sumGroupSetWeightKg(groupSet.reps));
  const totalRepCount = sumGroupSetRepCount(groupSet.reps);

  return (
    <li className="workspace-status-list__item workout-group-set-list__group-item">
      <div className="workout-issue-row-shell">
        <div
          className={[
            "workout-issue-row",
            "workout-dashboard-group-set-row",
            expanded
              ? "workout-issue-row--group-set workspace-status-group workspace-status-group--backlog"
              : null,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <button
            type="button"
            className="workout-group-set-collapse"
            aria-expanded={expanded}
            aria-label={expanded ? `Collapse ${exercise}` : `Expand ${exercise}`}
            title={expanded ? "Collapse sets" : "Expand sets"}
            onClick={onToggleExpanded}
          >
            <span className="workspace-status-group__chevron-slot" aria-hidden="true">
              <GroupChevron expanded={expanded} />
            </span>
          </button>
          <div className="project-issue-row project-issue-row--grouped workout-group-set-row workout-issue-row__content">
            <span className="project-issue-row__title" title={exercise}>
              {groupSet.reps.length > 0 ? (
                <span
                  className="workout-dashboard-group-set-row__rep-total"
                  title="Total reps across all sets"
                  aria-label={`${totalRepCount} reps`}
                >
                  <span className="workout-dashboard-group-set-row__rep-total-value">
                    {totalRepCount}
                  </span>
                  <span className="workout-dashboard-group-set-row__rep-total-icon" aria-hidden="true">
                    <WorkoutRepsIcon />
                  </span>
                </span>
              ) : null}
              <span className="project-issue-row__title-text">{exercise}</span>
            </span>
            <div className="workout-group-set-row__trailing">
              <span
                className="project-issue-row__pill workout-group-set-row__count"
                title="Total weight across sets"
              >
                <span className="project-issue-row__pill-dot" aria-hidden="true" />
                <span className="project-issue-row__pill-label">{totalWeightLabel}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

export function WorkoutsDashboard({
  teamId,
  enabled,
}: {
  teamId: string | null;
  enabled: boolean;
}) {
  const { setActiveVaultDocument } = useContentPanelNavigation();
  const { periodView } = useWorkoutsPeriodView();
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [creatingMilestone, setCreatingMilestone] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [expandedGroupSetIds, setExpandedGroupSetIds] = useState<Set<string>>(() => new Set());
  const [expandedSessionDateKeys, setExpandedSessionDateKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedYearProjectId, setSelectedYearProjectId] = useState<string | null>(null);
  const normalizedTeamId = teamId?.trim() ?? "";
  const workoutsEnabled = enabled && Boolean(normalizedTeamId);
  const todayDateKey = todayIso();
  const {
    projects: teamProjects,
    loading: teamProjectsLoading,
    error: teamProjectsError,
  } = useLinearTeamProjects(normalizedTeamId || null, workoutsEnabled);
  const {
    milestones,
    loading,
    refreshing,
    error,
    refresh,
    createMilestoneForDate,
  } = useLinearWorkoutMilestones({
    teamId: normalizedTeamId,
    enabled: workoutsEnabled,
  });

  useEffect(() => {
    if (teamProjects.length === 0) {
      setSelectedYearProjectId(null);
      return;
    }

    setSelectedYearProjectId((current) => {
      if (current && teamProjects.some((project) => project.id === current)) {
        return current;
      }
      return defaultWorkoutYearProjectId(teamProjects);
    });
  }, [teamProjects]);

  const yearMilestones = useMemo(() => {
    if (!selectedYearProjectId) return [];
    return milestones.filter((milestone) => milestone.projectId === selectedYearProjectId);
  }, [milestones, selectedYearProjectId]);

  const groupedSessions = useMemo(
    () => groupWorkoutMilestonesForPeriodView(yearMilestones, periodView),
    [yearMilestones, periodView],
  );

  const sessionDateKeys = useMemo(() => {
    return groupedSessions.flatMap((group) =>
      group.milestones
        .map((milestone) => workoutMilestoneDateKey(milestone))
        .filter((dateKey): dateKey is string => Boolean(dateKey)),
    );
  }, [groupedSessions]);

  const {
    sessionsByDate,
    loading: sessionsLoading,
    error: sessionsError,
    refresh: refreshSessions,
  } = useWorkoutDashboardSessions({
    teamId: normalizedTeamId,
    dateKeys: sessionDateKeys,
    enabled: workoutsEnabled && sessionDateKeys.length > 0,
  });

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredGroupedSessions = useMemo(() => {
    if (!normalizedSearch) return groupedSessions;
    return groupedSessions
      .map((group) => ({
        ...group,
        milestones: group.milestones.filter((milestone) => {
          const dateKey = workoutMilestoneDateKey(milestone);
          if (!dateKey) return false;
          return workoutMilestoneMatchesSearch(
            milestone,
            normalizedSearch,
            sessionsByDate[dateKey],
          );
        }),
      }))
      .filter((group) => group.milestones.length > 0);
  }, [groupedSessions, normalizedSearch, sessionsByDate]);

  useContentPanelBarState({
    error: error ?? sessionsError ?? teamProjectsError,
    loading: workoutsEnabled && loading && milestones.length === 0,
    loadingMessage: "Loading workouts…",
    refreshing,
    onRefresh: () => {
      void refresh();
      void refreshSessions();
    },
  });

  const sessionCount = useMemo(
    () => groupedSessions.reduce((count, group) => count + group.milestones.length, 0),
    [groupedSessions],
  );

  const filteredSessionCount = useMemo(
    () => filteredGroupedSessions.reduce((count, group) => count + group.milestones.length, 0),
    [filteredGroupedSessions],
  );

  const openSession = useCallback(
    (dateKey: string, label: string) => {
      setActiveVaultDocument({ path: workoutsDayPath(dateKey), title: label });
    },
    [setActiveVaultDocument],
  );

  const toggleGroupSetExpanded = useCallback((groupSetId: string) => {
    setExpandedGroupSetIds((current) => {
      const next = new Set(current);
      if (next.has(groupSetId)) {
        next.delete(groupSetId);
      } else {
        next.add(groupSetId);
      }
      return next;
    });
  }, []);

  const toggleSessionExpanded = useCallback((dateKey: string) => {
    setExpandedSessionDateKeys((current) => {
      const next = new Set(current);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  }, []);

  const hasTodayMilestone = useMemo(
    () => milestones.some((milestone) => workoutMilestoneDateKey(milestone) === todayDateKey),
    [milestones, todayDateKey],
  );
  const canCreateTodayMilestone = workoutsEnabled && !creatingMilestone && !hasTodayMilestone;

  const graphCollapsed = useWorkoutsDashboardGraphCollapsed();

  const handleCreateTodayMilestone = useCallback(async () => {
    if (!canCreateTodayMilestone) return;

    setCreatingMilestone(true);
    setCreateError(null);
    try {
      const result = await createMilestoneForDate(todayDateKey);
      if (result.error || !result.milestone) {
        setCreateError(result.error ?? "Failed to create workout session.");
        return;
      }

      const dateKey = workoutMilestoneDateKey(result.milestone);
      if (dateKey) {
        openSession(dateKey, formatWorkoutDayLabel(dateKey));
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create workout session.");
    } finally {
      setCreatingMilestone(false);
    }
  }, [canCreateTodayMilestone, createMilestoneForDate, openSession, todayDateKey]);

  useExplorerIosChrome(
    workoutsEnabled
      ? [
          {
            id: "workouts-create-session",
            label: "New session",
            disabled: !canCreateTodayMilestone,
            onClick: () => {
              void handleCreateTodayMilestone();
            },
          },
        ]
      : null,
  );

  const { searchVisibleClassName } = useIosExplorerSearchChrome({
    enabled: workoutsEnabled,
    label: "Search workouts",
    inputRef: searchInputRef,
  });

  if (!enabled || !normalizedTeamId) {
    return (
      <div className="workspace-status-list-scroll">
        <div className="workspace-status-list-empty">
          <p>Configure a workouts Linear team in Settings.</p>
        </div>
      </div>
    );
  }

  if (loading && sessionCount === 0) {
    return <div className="workspace-status-list-scroll" aria-busy="true" />;
  }

  return (
    <div className="workout-dashboard workout-dashboard--linear">
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
          placeholder="Search workouts…"
          aria-label="Search workouts"
          disabled={!workoutsEnabled}
        />
      </div>
      <header className="workout-dashboard-header">
        <div className="workout-dashboard-header-title-row">
          <h1 className="workout-dashboard-title">Workouts</h1>
          {selectedYearProjectId ? (
            <WorkoutsYearPicker
              value={selectedYearProjectId}
              onChange={setSelectedYearProjectId}
              projects={teamProjects}
              disabled={teamProjectsLoading}
            />
          ) : null}
        </div>
        <button
          type="button"
          className="workout-dashboard-refresh"
          onClick={() => {
            void handleCreateTodayMilestone();
          }}
          disabled={!canCreateTodayMilestone}
        >
          {creatingMilestone ? "Creating…" : "New session"}
        </button>
      </header>

      <div
        className={[
          "workout-dashboard-graph-placeholder",
          graphCollapsed ? "workout-dashboard-graph-placeholder--collapsed" : null,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
        data-testid="workout-dashboard-graph-placeholder"
      />

      {createError ? (
        <div className="workout-dashboard-error" role="alert">
          {createError}
        </div>
      ) : null}

      {error ? (
        <div className="workspace-status-list-error" role="alert">
          {error}
        </div>
      ) : null}

      {sessionCount === 0 ? (
        <div className="workspace-status-list-empty">
          <p>No workout sessions yet. Use New session to create today&apos;s workout.</p>
        </div>
      ) : filteredSessionCount === 0 ? (
        <div className="workspace-status-list-empty">
          <p>No workout sessions match your search.</p>
        </div>
      ) : (
        filteredGroupedSessions.map((group) => (
          <section key={group.key} className="workout-dashboard-group">
            {periodView !== "yearly" ? (
              <h2 className="workout-dashboard-group-title">{group.label}</h2>
            ) : null}
            <ul className="workspace-status-list workspace-status-list--issues workout-dashboard-session-list">
              {group.milestones.map((milestone) => {
                const dateKey = workoutMilestoneDateKey(milestone);
                if (!dateKey) return null;
                const label = formatWorkoutDayLabel(dateKey);
                const session = sessionsByDate[dateKey];
                const groupSets = session?.groupSets ?? [];
                const parentIssueCount =
                  session != null ? groupSets.length : sessionsLoading ? null : 0;
                const sessionTotalWeightLabel =
                  session != null
                    ? formatGroupSetTotalWeightKg(sumSessionGroupSetWeightKg(groupSets))
                    : null;

                const sessionExpanded = expandedSessionDateKeys.has(dateKey);

                return (
                  <li key={milestone.id} className="workout-dashboard-session">
                    <div
                      className={[
                        "workout-dashboard-session-header",
                        sessionExpanded
                          ? "workout-dashboard-session-header--expanded workspace-status-group workspace-status-group--backlog"
                          : "workout-dashboard-session-header--collapsed",
                      ].join(" ")}
                    >
                      <button
                        type="button"
                        className="workout-group-set-collapse workout-dashboard-session-collapse"
                        aria-expanded={sessionExpanded}
                        aria-label={
                          sessionExpanded ? `Collapse ${label}` : `Expand ${label}`
                        }
                        title={sessionExpanded ? "Collapse session" : "Expand session"}
                        onClick={() => toggleSessionExpanded(dateKey)}
                      >
                        <span className="workspace-status-group__chevron-slot" aria-hidden="true">
                          <GroupChevron expanded={sessionExpanded} />
                        </span>
                      </button>
                      <button
                        type="button"
                        className="project-issue-row workout-dashboard-session-row"
                        onClick={() => openSession(dateKey, label)}
                      >
                        <span className="project-issue-row__title" title={label}>
                          <span className="project-issue-row__title-text">{label}</span>
                        </span>
                        {parentIssueCount !== null ? (
                          <div className="workout-dashboard-session-row__trailing">
                            <span
                              className="project-issue-row__pill workout-dashboard-session-row__count"
                              title={
                                parentIssueCount === 1
                                  ? "1 parent issue"
                                  : `${parentIssueCount} parent issues`
                              }
                            >
                              <span className="project-issue-row__pill-dot" aria-hidden="true" />
                              <span className="project-issue-row__pill-label">{parentIssueCount}</span>
                            </span>
                            {sessionTotalWeightLabel ? (
                              <span
                                className="project-issue-row__pill workout-group-set-row__count workout-dashboard-session-row__weight"
                                title="Total weight across all exercises"
                              >
                                <span className="project-issue-row__pill-dot" aria-hidden="true" />
                                <span className="project-issue-row__pill-label">
                                  {sessionTotalWeightLabel}
                                </span>
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </button>
                    </div>

                    {sessionExpanded ? (
                      sessionsLoading && !session ? (
                        <p className="workout-dashboard-session-loading">Loading sets…</p>
                      ) : groupSets.length > 0 ? (
                        <ul className="workspace-status-list workspace-status-list--issues workout-group-set-list workout-dashboard-group-set-list">
                          {groupSets.flatMap((groupSet) => {
                            const expanded = expandedGroupSetIds.has(groupSet.id);
                            return [
                              <WorkoutDashboardGroupSetRow
                                key={groupSet.id}
                                groupSet={groupSet}
                                expanded={expanded}
                                onToggleExpanded={() => toggleGroupSetExpanded(groupSet.id)}
                              />,
                              ...(expanded
                                ? groupSet.reps.map((rep, repIndex) => (
                                    <WorkoutRepSummaryRow
                                      key={rep.id}
                                      rep={rep}
                                      groupReps={groupSet.reps}
                                      isLastInGroup={repIndex === groupSet.reps.length - 1}
                                    />
                                  ))
                                : []),
                            ];
                          })}
                        </ul>
                      ) : null
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
