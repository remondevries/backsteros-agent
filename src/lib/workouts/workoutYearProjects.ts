import type { LinearTeamProjectSummary } from "../api";

export const WORKOUT_PERSONAL_RECORDS_PROJECT_NAME = "Personal Records";

export function isWorkoutYearProjectName(name: string): boolean {
  return /^\d{4}$/.test(name.trim());
}

export function isWorkoutPersonalRecordsProjectName(name: string): boolean {
  return (
    name.trim().localeCompare(WORKOUT_PERSONAL_RECORDS_PROJECT_NAME, undefined, {
      sensitivity: "base",
    }) === 0
  );
}

export function listWorkoutYearProjects(
  projects: Pick<LinearTeamProjectSummary, "id" | "name">[],
): LinearTeamProjectSummary[] {
  return projects
    .filter(
      (project) =>
        isWorkoutYearProjectName(project.name) &&
        !isWorkoutPersonalRecordsProjectName(project.name),
    )
    .sort((left, right) => {
      const leftYear = Number.parseInt(left.name, 10);
      const rightYear = Number.parseInt(right.name, 10);
      return rightYear - leftYear;
    });
}

export function defaultWorkoutYearProjectId(
  projects: Pick<LinearTeamProjectSummary, "id" | "name">[],
  referenceYear = new Date().getFullYear(),
): string | null {
  const yearProjects = listWorkoutYearProjects(projects);
  if (yearProjects.length === 0) return null;

  const match = yearProjects.find((project) => project.name === String(referenceYear));
  return match?.id ?? yearProjects[0]!.id;
}
