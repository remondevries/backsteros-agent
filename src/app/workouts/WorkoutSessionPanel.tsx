import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent, type RefObject } from "react";
import type { WorkoutGroupSetEntity, WorkoutRepEntity } from "../../lib/api";
import { useWorkoutSession } from "../../hooks/useWorkoutSession";
import { useLinearWorkoutSetLabels } from "../../hooks/useLinearWorkoutSetLabels";
import { useContentPanelBarState } from "../../hooks/useContentPanelBarState";
import { useIosExplorerSearchChrome } from "../../hooks/useIosExplorerSearchChrome";
import { useLinearWorkspaceTabCreateAction } from "../../hooks/useLinearWorkspaceTabCreateAction";
import { type LinearWorkoutSetLabel } from "../../lib/workouts/linearWorkoutTypes";
import { resolveWorkoutExerciseFromLabels } from "../../lib/workouts/workoutExerciseLabelMatch";
import {
  findLastWorkoutGroupSetWithoutReps,
  findLastWorkoutRepInSession,
  formatGroupSetTotalWeightKg,
  formatRepCountDisplay,
  formatRepWeightDisplay,
  isWorkoutRepEmpty,
  normalizeIntegerInput,
  normalizeNumericInput,
  repVolumeProgressPercent,
  sumGroupSetWeightKg,
  sumSessionGroupSetWeightKg,
} from "../../lib/workouts/workoutRepDisplay";
import { WorkoutExerciseField } from "./WorkoutExerciseField";
import { WorkoutIssueRowShell } from "./WorkoutSwipeToDeleteShell";
import { WorkoutRepsIcon } from "./WorkoutRepsIcon";
import { GroupChevron } from "../workspace-list/GroupChevron";
import { GroupHeaderAddButton } from "../workspace-list/GroupHeaderAddButton";
import { isIosDevice } from "../../platform/iosStandalone";

const WORKOUT_WEIGHT_INPUT_PADDING_X = 12;

function useAutoSizedInputWidth(text: string, minWidth = 20) {
  const measureRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(minWidth);

  useLayoutEffect(() => {
    const measureEl = measureRef.current;
    if (!measureEl) {
      return;
    }

    const textWidth = measureEl.getBoundingClientRect().width;
    setWidth(Math.max(minWidth, Math.ceil(textWidth) + WORKOUT_WEIGHT_INPUT_PADDING_X));
  }, [minWidth, text]);

  return { measureRef, width };
}

function WorkoutRepRow({
  rep,
  groupReps,
  deleting,
  updating,
  autoFocusWeight,
  isLastInGroup,
  onUpdateWeight,
  onUpdateReps,
  onDelete,
}: {
  rep: WorkoutRepEntity;
  groupReps: WorkoutRepEntity[];
  deleting: boolean;
  updating: boolean;
  autoFocusWeight: boolean;
  isLastInGroup: boolean;
  onUpdateWeight: (weight: string) => Promise<{ success: boolean; error: string | null }>;
  onUpdateReps: (count: number) => Promise<{ success: boolean; error: string | null }>;
  onDelete: () => void;
}) {
  const weightInputRef = useRef<HTMLInputElement>(null);
  const repsInputRef = useRef<HTMLInputElement>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [weightDraft, setWeightDraft] = useState(() => formatRepWeightDisplay(rep.title));
  const [repsDraft, setRepsDraft] = useState(() => formatRepCountDisplay(rep));
  const weightSizingText = weightDraft.length > 0 ? weightDraft : "0";
  const repsSizingText = repsDraft.length > 0 ? repsDraft : "0";
  const { measureRef: weightMeasureRef, width: weightInputWidth } =
    useAutoSizedInputWidth(weightSizingText);
  const { measureRef: repsMeasureRef, width: repsInputWidth } =
    useAutoSizedInputWidth(repsSizingText);
  const progressPercent = repVolumeProgressPercent(groupReps, rep);

  useEffect(() => {
    setWeightDraft(formatRepWeightDisplay(rep.title));
    setRepsDraft(formatRepCountDisplay(rep));
    setSaveError(null);
  }, [rep.id, rep.title, rep.description, rep.reps]);

  useEffect(() => {
    if (!autoFocusWeight) {
      return;
    }
    weightInputRef.current?.focus();
    weightInputRef.current?.select();
  }, [autoFocusWeight, rep.id]);

  const focusWeightInput = () => {
    if (deleting || updating) {
      return;
    }
    weightInputRef.current?.focus();
    weightInputRef.current?.select();
  };

  const focusRepsInput = () => {
    if (deleting || updating) {
      return;
    }
    repsInputRef.current?.focus();
    repsInputRef.current?.select();
  };

  const handleWeightSlotPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    if (event.target instanceof HTMLInputElement) {
      return;
    }
    event.preventDefault();
    focusWeightInput();
  };

  const handleRepsSlotPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    if (event.target instanceof HTMLInputElement) {
      return;
    }
    event.preventDefault();
    focusRepsInput();
  };

  const handleWeightBlur = async () => {
    const nextWeight = weightDraft.trim();
    const currentWeight = formatRepWeightDisplay(rep.title);
    if (!nextWeight || nextWeight === currentWeight) {
      setWeightDraft(currentWeight);
      return;
    }

    const result = await onUpdateWeight(nextWeight);
    if (!result.success) {
      setSaveError(result.error);
      setWeightDraft(currentWeight);
      return;
    }

    setSaveError(null);
  };

  const handleRepsBlur = async () => {
    const normalizedReps = normalizeIntegerInput(repsDraft);
    const currentReps = formatRepCountDisplay(rep);
    if (!normalizedReps) {
      setRepsDraft(currentReps);
      return;
    }
    if (normalizedReps === currentReps) {
      return;
    }

    const parsedCount = Number.parseInt(normalizedReps, 10);
    if (!Number.isFinite(parsedCount) || parsedCount <= 0) {
      setSaveError("Enter a valid rep count.");
      setRepsDraft(currentReps);
      return;
    }

    const result = await onUpdateReps(parsedCount);
    if (!result.success) {
      setSaveError(result.error);
      setRepsDraft(currentReps);
      return;
    }

    setSaveError(null);
  };

  return (
    <li
      className={[
        "workspace-status-list__item",
        "workout-rep-list__item",
        isLastInGroup ? "workout-rep-list__item--last" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <WorkoutIssueRowShell
        onDelete={() => void onDelete()}
        disabled={deleting || updating}
        deleteAriaLabel={`Delete ${rep.title}`}
        deleteTitle="Delete set"
      >
        <div className="workout-issue-row workout-issue-row--rep" aria-busy={updating || undefined}>
          <div className="project-issue-row project-issue-row--grouped workout-rep-row workout-issue-row__content">
            <div
              className="workout-rep-row__weight-slot"
              onPointerDown={handleWeightSlotPointerDown}
            >
              <div className="workout-rep-row__weight-field">
                <div className="workout-rep-row__weight-sizer">
                  <span ref={weightMeasureRef} className="workout-rep-row__weight-measure" aria-hidden="true">
                    {weightSizingText}
                  </span>
                  <input
                    ref={weightInputRef}
                    type="text"
                    className="workout-rep-row__weight-input"
                    style={{ width: weightInputWidth }}
                    value={weightDraft}
                    placeholder="0"
                    disabled={deleting || updating}
                    onChange={(event) => setWeightDraft(normalizeNumericInput(event.target.value))}
                    onBlur={() => void handleWeightBlur()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                    }}
                    aria-label="Weight in kg"
                    inputMode="decimal"
                    autoComplete="off"
                    size={1}
                  />
                </div>
                <span className="workout-rep-row__weight-unit" aria-hidden="true">
                  kg
                </span>
              </div>
            </div>

            <div
              className="workout-rep-row__progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              aria-label="Set volume relative to heaviest set in group"
              title={`${progressPercent}% of group max volume`}
            >
              <div className="workout-rep-row__progress-track">
                <div
                  className="workout-rep-row__progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div
              className="workout-rep-row__reps-slot"
              onPointerDown={handleRepsSlotPointerDown}
            >
              <div className="workout-rep-row__reps-field">
                <div className="workout-rep-row__reps-sizer">
                  <span ref={repsMeasureRef} className="workout-rep-row__reps-measure" aria-hidden="true">
                    {repsSizingText}
                  </span>
                  <input
                    ref={repsInputRef}
                    type="text"
                    className="workout-rep-row__reps-input"
                    style={{ width: repsInputWidth }}
                    value={repsDraft}
                    placeholder="0"
                    disabled={deleting || updating}
                    onChange={(event) => setRepsDraft(normalizeIntegerInput(event.target.value))}
                    onBlur={() => void handleRepsBlur()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                    }}
                    aria-label="Number of reps"
                    inputMode="numeric"
                    autoComplete="off"
                    size={1}
                  />
                </div>
                <span className="workout-rep-row__reps-unit" aria-hidden="true">
                  <WorkoutRepsIcon />
                </span>
              </div>
            </div>
          </div>
        </div>
      </WorkoutIssueRowShell>
      {saveError ? (
        <p className="workout-issue-row__error" role="alert">
          {saveError}
        </p>
      ) : null}
    </li>
  );
}

function WorkoutGroupSetRow({
  groupSet,
  labels,
  labelsLoading,
  deleting,
  updating,
  collapsed,
  onToggleCollapsed,
  onUpdateExercise,
  onDelete,
}: {
  groupSet: WorkoutGroupSetEntity;
  labels: LinearWorkoutSetLabel[];
  labelsLoading: boolean;
  deleting: boolean;
  updating: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onUpdateExercise: (exercise: string, labelId: string | null) => Promise<{ success: boolean; error: string | null }>;
  onDelete: () => void;
}) {
  const exerciseName = groupSet.exercise?.trim() || groupSet.title.trim();
  const [exerciseDraft, setExerciseDraft] = useState(exerciseName);
  const [saveError, setSaveError] = useState<string | null>(null);
  const totalWeightLabel = formatGroupSetTotalWeightKg(sumGroupSetWeightKg(groupSet.reps));

  useEffect(() => {
    const resolved = resolveWorkoutExerciseFromLabels(exerciseName, labels);
    setExerciseDraft(resolved.text);
    setSaveError(null);
  }, [groupSet.id, exerciseName, labels]);

  const handleExerciseBlur = async (nextValue?: string, labelIdFromField?: string | null) => {
    const nextExercise = (nextValue ?? exerciseDraft).trim();
    const resolved = resolveWorkoutExerciseFromLabels(nextExercise, labels);
    const exerciseToSave = resolved.text.trim();
    const labelToSave =
      labelIdFromField !== undefined ? labelIdFromField : resolved.labelId;

    if (!exerciseToSave) {
      setExerciseDraft(exerciseName);
      return;
    }
    if (exerciseToSave === exerciseName && !labelToSave) {
      setExerciseDraft(exerciseName);
      return;
    }

    const result = await onUpdateExercise(exerciseToSave, labelToSave);
    if (!result.success) {
      setSaveError(result.error);
      setExerciseDraft(exerciseName);
      return;
    }

    setSaveError(null);
  };

  return (
    <li className="workspace-status-list__item workout-group-set-list__group-item">
      <WorkoutIssueRowShell
        onDelete={() => void onDelete()}
        disabled={deleting || updating}
        deleteAriaLabel={`Delete ${groupSet.title}`}
        deleteTitle="Delete exercise group"
      >
        <div
          className={[
            "workout-issue-row",
            !collapsed
              ? "workout-issue-row--group-set workspace-status-group workspace-status-group--backlog"
              : null,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <button
            type="button"
            className="workout-group-set-collapse"
            aria-expanded={!collapsed}
            aria-label={collapsed ? `Expand ${groupSet.title}` : `Collapse ${groupSet.title}`}
            title={collapsed ? "Expand sets" : "Collapse sets"}
            disabled={deleting}
            onClick={onToggleCollapsed}
          >
            <span className="workspace-status-group__chevron-slot" aria-hidden="true">
              <GroupChevron expanded={!collapsed} />
            </span>
          </button>
          <div className="project-issue-row project-issue-row--grouped workout-group-set-row workout-issue-row__content">
            <WorkoutExerciseField
              value={exerciseDraft}
              onChange={setExerciseDraft}
              onBlur={(resolved, labelId) => void handleExerciseBlur(resolved, labelId)}
              labels={labels}
              labelsLoading={labelsLoading}
              disabled={deleting || updating}
              inputClassName="workout-group-set-row__exercise-input"
            />
            <div className="workout-group-set-row__trailing">
              {updating ? <span className="workout-issue-row__saving">Saving…</span> : null}
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
      </WorkoutIssueRowShell>
      {saveError ? (
        <p className="workout-issue-row__error workout-group-set-row__error" role="alert">
          {saveError}
        </p>
      ) : null}
    </li>
  );
}

function WorkoutSessionSummaryKpis({
  workoutCount,
  totalWeightLabel,
  quickCreateLabel,
  quickCreateDisabled,
  onQuickCreate,
}: {
  workoutCount: number;
  totalWeightLabel: string;
  quickCreateLabel?: string;
  quickCreateDisabled?: boolean;
  onQuickCreate?: () => void;
}) {
  const showDesktopQuickCreate =
    !isIosDevice() && quickCreateLabel && onQuickCreate;

  return (
    <div className="workout-session-panel__band workout-session-panel__summary-band">
      <div className="workout-session-panel__content">
        <div
          className={[
            "workout-session-summary-kpis",
            showDesktopQuickCreate ? "workout-session-summary-kpis--with-action" : null,
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label="Session summary"
        >
          <div className="workout-session-summary-kpis__stats">
            <div className="workout-kpi-tile workout-kpi-tile--stat">
              <div className="workout-kpi-label">Workouts</div>
              <div className="workout-kpi-value">{workoutCount}</div>
            </div>
            <div className="workout-kpi-tile workout-kpi-tile--stat">
              <div className="workout-kpi-label">Total weight</div>
              <div className="workout-kpi-value">{totalWeightLabel}</div>
            </div>
          </div>
          {showDesktopQuickCreate ? (
            <GroupHeaderAddButton
              label={quickCreateLabel}
              disabled={quickCreateDisabled}
              onClick={onQuickCreate}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function WorkoutSetEntryForm({
  enabled,
  submitting,
  labels,
  labelsLoading,
  exerciseDraft,
  onExerciseDraftChange,
  formError,
  onFormErrorChange,
  exerciseInputRef,
  createGroupSet,
  onCreated,
}: {
  enabled: boolean;
  submitting: boolean;
  labels: LinearWorkoutSetLabel[];
  labelsLoading: boolean;
  exerciseDraft: string;
  onExerciseDraftChange: (value: string) => void;
  formError: string | null;
  onFormErrorChange: (value: string | null) => void;
  exerciseInputRef?: RefObject<HTMLInputElement | null>;
  createGroupSet: (exercise: string) => Promise<{
    groupSet: WorkoutGroupSetEntity | null;
    error: string | null;
  }>;
  onCreated?: () => void;
}) {

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    onFormErrorChange(null);

    const resolved = resolveWorkoutExerciseFromLabels(exerciseDraft, labels);
    const exercise = resolved.text.trim();
    if (!exercise) {
      onFormErrorChange("Enter an exercise name.");
      return;
    }

    if (resolved.text !== exerciseDraft) {
      onExerciseDraftChange(resolved.text);
    }

    const result = await createGroupSet(exercise);

    if (result.error) {
      onFormErrorChange(result.error);
      return;
    }

    onExerciseDraftChange("");
    onCreated?.();
  };

  const submitDisabled = !enabled || submitting || !exerciseDraft.trim();

  return (
    <form
      className="workout-rep-entry-form workout-session-panel__band"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <div className="workout-session-panel__content">
        <div className="workout-set-entry-row">
          <WorkoutExerciseField
            value={exerciseDraft}
            onChange={onExerciseDraftChange}
            labels={labels}
            labelsLoading={labelsLoading}
            disabled={!enabled || submitting}
            inputClassName="workout-set-entry-row__exercise-input"
            inputRef={exerciseInputRef}
          />
          <button
            type="submit"
            className="btn-primary workout-set-entry-row__submit"
            disabled={submitDisabled}
          >
            {submitting ? "Saving…" : "Add set"}
          </button>
        </div>
        {formError ? <p className="workout-set-entry-error">{formError}</p> : null}
      </div>
    </form>
  );
}

export function WorkoutSessionPanel({
  teamId,
  dateKey,
  enabled,
}: {
  teamId: string;
  dateKey: string;
  enabled: boolean;
}) {
  const { labels, loading: labelsLoading } = useLinearWorkoutSetLabels(
    teamId,
    enabled && Boolean(teamId.trim()),
  );
  const {
    groupSets,
    loading,
    refreshing,
    error,
    refresh,
    createGroupSet,
    addRepToGroupSet,
    submitting,
    addingRepToGroupSetId,
    deletingIssueId,
    updatingIssueId,
    deleteRep,
    deleteGroupSet,
    updateGroupSetExercise,
    updateRepCount,
    updateRepWeight,
  } = useWorkoutSession({
    teamId,
    dateKey,
    enabled,
  });
  useIosExplorerSearchChrome({
    enabled: enabled && Boolean(teamId.trim()),
    label: "Search workouts",
  });
  const [focusRepId, setFocusRepId] = useState<string | null>(null);
  const [collapsedGroupSetIds, setCollapsedGroupSetIds] = useState<Set<string>>(() => new Set());
  const [exerciseDraft, setExerciseDraft] = useState("");
  const [entryFormError, setEntryFormError] = useState<string | null>(null);
  const exerciseInputRef = useRef<HTMLInputElement>(null);

  const lastRepInSession = useMemo(() => findLastWorkoutRepInSession(groupSets), [groupSets]);
  const groupSetWithoutReps = useMemo(
    () => findLastWorkoutGroupSetWithoutReps(groupSets),
    [groupSets],
  );
  const quickCreateWillAddGroup = useMemo(() => {
    if (groupSetWithoutReps) {
      return false;
    }
    if (!lastRepInSession) {
      return true;
    }
    return isWorkoutRepEmpty(lastRepInSession.rep);
  }, [groupSetWithoutReps, lastRepInSession]);
  const quickCreateLabel = quickCreateWillAddGroup ? "New exercise" : "Add set";
  const quickCreateBusy =
    submitting || addingRepToGroupSetId !== null || deletingIssueId !== null;

  const sessionSummary = useMemo(() => {
    const totalWeightKg = sumSessionGroupSetWeightKg(groupSets);
    return {
      workoutCount: groupSets.length,
      totalWeightLabel: formatGroupSetTotalWeightKg(totalWeightKg),
    };
  }, [groupSets]);

  const toggleGroupSetCollapsed = (groupSetId: string) => {
    setCollapsedGroupSetIds((current) => {
      const next = new Set(current);
      if (next.has(groupSetId)) {
        next.delete(groupSetId);
      } else {
        next.add(groupSetId);
      }
      return next;
    });
  };

  const expandGroupSet = (groupSetId: string) => {
    setCollapsedGroupSetIds((current) => {
      if (!current.has(groupSetId)) {
        return current;
      }
      const next = new Set(current);
      next.delete(groupSetId);
      return next;
    });
  };

  const handleAddRepToGroupSet = useCallback(
    async (groupSet: WorkoutGroupSetEntity) => {
      expandGroupSet(groupSet.id);
      const result = await addRepToGroupSet(groupSet);
      if (result.rep) {
        setFocusRepId(result.rep.id);
      }
      return result;
    },
    [addRepToGroupSet],
  );

  const handleQuickCreate = useCallback(async () => {
    if (quickCreateBusy) {
      return;
    }

    const addRepTarget =
      groupSetWithoutReps ??
      (lastRepInSession && !isWorkoutRepEmpty(lastRepInSession.rep)
        ? lastRepInSession.groupSet
        : null);

    if (addRepTarget) {
      setEntryFormError(null);
      const repResult = await handleAddRepToGroupSet(addRepTarget);
      if (repResult.error) {
        setEntryFormError(repResult.error);
      }
      return;
    }

    if (quickCreateWillAddGroup) {
      if (
        lastRepInSession &&
        isWorkoutRepEmpty(lastRepInSession.rep)
      ) {
        const { rep, groupSet } = lastRepInSession;
        const onlyRepInGroup = groupSet.reps.length === 1;
        await deleteRep(rep.id);
        if (onlyRepInGroup) {
          await deleteGroupSet(groupSet);
        }
      }

      const resolved = resolveWorkoutExerciseFromLabels(exerciseDraft, labels);
      const exercise = resolved.text.trim();
      if (!exercise) {
        setEntryFormError("Enter an exercise name.");
        exerciseInputRef.current?.focus();
        return;
      }

      if (resolved.text !== exerciseDraft) {
        setExerciseDraft(resolved.text);
      }

      setEntryFormError(null);
      const groupResult = await createGroupSet(exercise);
      if (groupResult.error || !groupResult.groupSet) {
        if (groupResult.error) {
          setEntryFormError(groupResult.error);
        }
        return;
      }

      setExerciseDraft("");
      expandGroupSet(groupResult.groupSet.id);
      const repResult = await handleAddRepToGroupSet(groupResult.groupSet);
      if (repResult.error) {
        setEntryFormError(repResult.error);
      }
    }
  }, [
    createGroupSet,
    deleteGroupSet,
    deleteRep,
    exerciseDraft,
    groupSetWithoutReps,
    handleAddRepToGroupSet,
    labels,
    lastRepInSession,
    quickCreateBusy,
    quickCreateWillAddGroup,
  ]);

  useLinearWorkspaceTabCreateAction(
    enabled && Boolean(teamId.trim())
      ? {
          disabled: quickCreateBusy,
          label: quickCreateLabel,
          onCreate: () => {
            void handleQuickCreate();
          },
        }
      : null,
  );

  useContentPanelBarState({
    error,
    loading: enabled && loading && groupSets.length === 0,
    loadingMessage: "Loading session…",
    refreshing,
    onRefresh: refresh,
    iosNavItemId: "workouts",
  });

  if (!enabled || !teamId.trim()) {
    return (
      <div className="workspace-status-list-scroll">
        <div className="workspace-status-list-empty">
          <p>Configure a workouts Linear team in Settings.</p>
        </div>
      </div>
    );
  }

  if (loading && groupSets.length === 0) {
    return <div className="workspace-status-list-scroll" aria-busy="true" />;
  }

  return (
    <div className="workout-session-panel">
      <WorkoutSessionSummaryKpis
        workoutCount={sessionSummary.workoutCount}
        totalWeightLabel={sessionSummary.totalWeightLabel}
        quickCreateLabel={quickCreateLabel}
        quickCreateDisabled={quickCreateBusy}
        onQuickCreate={() => {
          void handleQuickCreate();
        }}
      />
      <WorkoutSetEntryForm
        enabled={enabled}
        submitting={submitting}
        labels={labels}
        labelsLoading={labelsLoading}
        exerciseDraft={exerciseDraft}
        onExerciseDraftChange={setExerciseDraft}
        formError={entryFormError}
        onFormErrorChange={setEntryFormError}
        exerciseInputRef={exerciseInputRef}
        createGroupSet={createGroupSet}
        onCreated={() => void refresh({ background: true })}
      />

      {error ? (
        <div className="workout-session-panel__band workout-session-panel__error-band" role="alert">
          <div className="workspace-status-list-error workout-session-panel__content workout-session-panel__error">
            {error}
          </div>
        </div>
      ) : null}

      <div className="workspace-status-list-scroll">
        <div className="workout-session-panel__content">
          {groupSets.length === 0 ? (
            <div className="workspace-status-list-empty workout-session-panel__empty">
              <p>No group sets yet. Add a set to start an exercise group.</p>
            </div>
          ) : (
            <ul className="workspace-status-list workspace-status-list--issues workout-group-set-list">
              {groupSets.flatMap((groupSet) => [
                <WorkoutGroupSetRow
                  key={groupSet.id}
                  groupSet={groupSet}
                  labels={labels}
                  labelsLoading={labelsLoading}
                  deleting={deletingIssueId === groupSet.id}
                  updating={updatingIssueId === groupSet.id}
                  collapsed={collapsedGroupSetIds.has(groupSet.id)}
                  onToggleCollapsed={() => toggleGroupSetCollapsed(groupSet.id)}
                  onUpdateExercise={(exercise, labelId) =>
                    updateGroupSetExercise(groupSet.id, exercise, labelId)
                  }
                  onDelete={() => void deleteGroupSet(groupSet)}
                />,
                ...(collapsedGroupSetIds.has(groupSet.id)
                  ? []
                  : groupSet.reps.map((rep, repIndex) => (
                  <WorkoutRepRow
                    key={rep.id}
                    rep={rep}
                    groupReps={groupSet.reps}
                    deleting={deletingIssueId === rep.id}
                    updating={updatingIssueId === rep.id}
                    autoFocusWeight={focusRepId === rep.id}
                    isLastInGroup={repIndex === groupSet.reps.length - 1}
                    onUpdateWeight={(weight) => updateRepWeight(rep.id, weight)}
                    onUpdateReps={(count) => updateRepCount(rep.id, count)}
                    onDelete={() => {
                      if (focusRepId === rep.id) {
                        setFocusRepId(null);
                      }
                      void deleteRep(rep.id);
                    }}
                  />
                ))),
              ])}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
