import type { WorkoutSession } from "../../lib/workouts/types";

function formatVolumeShort(kg: number): string {
  if (kg <= 0) return "—";
  if (kg < 1000) return `${Math.round(kg)} kg`;
  return `${(kg / 1000).toFixed(1)}k kg`;
}

export function SessionsTable({
  sessions,
  onSelectDay,
}: {
  sessions: WorkoutSession[];
  onSelectDay?: (date: string) => void;
}) {
  if (sessions.length === 0) {
    return <p className="workout-sessions-empty">No workout sessions in this period.</p>;
  }

  return (
    <div className="workout-sessions-table">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Exercises</th>
            <th>Sets</th>
            <th>Volume</th>
            <th>Top lift</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.date}>
              <td>
                {onSelectDay ? (
                  <button
                    type="button"
                    className="workout-sessions-date-link"
                    onClick={() => onSelectDay(session.date)}
                  >
                    {session.date}
                  </button>
                ) : (
                  session.date
                )}
              </td>
              <td>{session.exercises.length}</td>
              <td>{session.totalSets}</td>
              <td>{formatVolumeShort(session.totalVolume)}</td>
              <td>{session.topLift || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
