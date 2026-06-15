import type { WorkoutRepEntity } from "../../lib/api";
import {
  formatRepCountDisplay,
  formatRepWeightDisplay,
  repVolumeProgressPercent,
} from "../../lib/workouts/workoutRepDisplay";

export function WorkoutRepSummaryRow({
  rep,
  groupReps,
  isLastInGroup,
}: {
  rep: WorkoutRepEntity;
  groupReps: WorkoutRepEntity[];
  isLastInGroup: boolean;
}) {
  const weightDisplay = formatRepWeightDisplay(rep.title);
  const repsDisplay = formatRepCountDisplay(rep);
  const progressPercent = repVolumeProgressPercent(groupReps, rep);

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
      <div className="workout-issue-row-shell">
        <div className="workout-issue-row workout-issue-row--rep">
          <div className="project-issue-row project-issue-row--grouped workout-rep-row workout-issue-row__content workout-rep-row--summary">
            <div className="workout-rep-row__weight-slot">
              <div className="workout-rep-row__weight-field workout-rep-row__weight-field--summary">
                <span className="workout-rep-row__summary-value">
                  {weightDisplay || "—"}
                </span>
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

            <div className="workout-rep-row__reps-slot">
              <div className="workout-rep-row__reps-field workout-rep-row__reps-field--summary">
                <span className="workout-rep-row__summary-value">
                  {repsDisplay || "—"}
                </span>
                <span className="workout-rep-row__reps-unit" aria-hidden="true">
                  reps
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
