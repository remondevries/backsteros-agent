import { useMemo } from "react";
import { useWorkoutSets } from "../../hooks/useWorkoutSets";
import { workoutDateKeyFromPath } from "../../lib/workouts/workoutDays";
import { computeWorkoutsRollups, workoutSessionsForDayDetail } from "../../lib/workouts/rollups";
import { WorkoutSetEntryForm } from "./WorkoutSetEntryForm";
import { formatWorkoutDayLabel } from "../../lib/workouts/workoutsBreadcrumb";

export function WorkoutSessionView({ path }: { path: string }) {
  const { sets, loading, error, refresh, appendSets, removeSet } = useWorkoutSets();
  const dateKey = workoutDateKeyFromPath(path);

  const daySets = useMemo(() => {
    if (!dateKey) return [];
    return sets.filter((set) => set.date === dateKey);
  }, [sets, dateKey]);

  const rollups = useMemo(() => computeWorkoutsRollups(daySets), [daySets]);
  const sessions = useMemo(() => {
    const session = rollups.sessions[0];
    if (!session) return [];
    return workoutSessionsForDayDetail(session);
  }, [rollups.sessions]);

  if (!dateKey) {
    return <p className="workout-session-error">Invalid workout session path.</p>;
  }

  if (loading) {
    return <p className="workout-dashboard-status">Loading session…</p>;
  }

  return (
    <div className="workout-session-view">
      <header className="workout-session-header">
        <h1 className="workout-session-title">{formatWorkoutDayLabel(dateKey)}</h1>
        <button type="button" className="workout-dashboard-refresh" onClick={() => void refresh()}>
          Refresh
        </button>
      </header>

      {error ? <p className="workout-dashboard-error">{error}</p> : null}

      <div className="workout-session-summary">
        <span>{rollups.kpis.totalSets} sets</span>
        <span>{Math.round(rollups.kpis.totalVolume)} kg volume</span>
        <span>{rollups.exercises.length} exercises</span>
      </div>

      <WorkoutSetEntryForm
        defaultDate={dateKey}
        onSubmit={async (set) => {
          await appendSets([set]);
        }}
      />

      {sessions.map((session, sessionIndex) => (
        <section key={sessionIndex} className="workout-session-block">
          {session.exercises.map((exercise) => (
            <div key={exercise.exercise} className="workout-exercise-block">
              <h3 className="workout-exercise-title">
                {exercise.exercise}
                <span className="workout-exercise-meta">{exercise.muscleGroup}</span>
              </h3>
              <table className="workout-sets-table">
                <thead>
                  <tr>
                    <th>Set</th>
                    <th>Reps</th>
                    <th>Weight</th>
                    <th>Detail</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {exercise.sets.map((set) => (
                    <tr key={`${set.exercise}-${set.setNumber}`}>
                      <td>{set.setNumber}</td>
                      <td>{set.reps}</td>
                      <td>{set.isBodyweight ? "BW" : `${set.weight} kg`}</td>
                      <td>{set.detail || "—"}</td>
                      <td>
                        <button
                          type="button"
                          className="workout-set-delete"
                          onClick={() =>
                            void removeSet({
                              date: set.date,
                              exercise: set.exercise,
                              setNumber: set.setNumber,
                            })
                          }
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      ))}

      {daySets.length === 0 ? (
        <p className="workout-sessions-empty">No sets logged for this day yet.</p>
      ) : null}
    </div>
  );
}
