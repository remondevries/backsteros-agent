import { useMemo } from "react";
import type { LinearTeamProjectSummary } from "../../lib/api";
import { listWorkoutYearProjects } from "../../lib/workouts/workoutYearProjects";
import { SettingsOptionPicker } from "../../settings/SettingsOptionPicker";

export function WorkoutsYearPicker({
  value,
  onChange,
  projects,
  disabled,
}: {
  value: string;
  onChange: (projectId: string) => void;
  projects: LinearTeamProjectSummary[];
  disabled?: boolean;
}) {
  const options = useMemo(
    () =>
      listWorkoutYearProjects(projects).map((project) => ({
        value: project.id,
        label: project.name,
      })),
    [projects],
  );

  if (options.length === 0) {
    return null;
  }

  return (
    <div className="workout-dashboard-year-picker">
      <SettingsOptionPicker
        value={value}
        onChange={onChange}
        options={options}
        disabled={disabled}
        searchable={false}
        placeholder="Year"
      />
    </div>
  );
}
