import { linearGraphqlRequest } from "./graphql.ts";
import { fetchLinearTeamProjects, type LinearTeamProjectSummary } from "./team-projects.ts";

export type WorkoutYearProjectStyle = {
  icon: string | null;
  color: string | null;
};

const PROJECT_STYLE_QUERY = `
  query BacksterWorkoutProjectStyle($projectId: String!) {
    project(id: $projectId) {
      icon
      color
    }
  }
`;

export function isWorkoutYearProjectName(name: string): boolean {
  return /^\d{4}$/.test(name.trim());
}

function workoutYearFromProjectName(name: string): number | null {
  if (!isWorkoutYearProjectName(name)) return null;
  return Number.parseInt(name.trim(), 10);
}

function sortWorkoutYearProjects(projects: LinearTeamProjectSummary[]): LinearTeamProjectSummary[] {
  return projects
    .map((project) => ({ project, year: workoutYearFromProjectName(project.name) }))
    .filter((entry): entry is { project: LinearTeamProjectSummary; year: number } => entry.year != null)
    .sort((left, right) => left.year - right.year)
    .map((entry) => entry.project);
}

async function fetchWorkoutYearProjectStyle(projectId: string): Promise<WorkoutYearProjectStyle> {
  const data = await linearGraphqlRequest<{
    project?: {
      icon?: string | null;
      color?: string | null;
    } | null;
  }>(PROJECT_STYLE_QUERY, { projectId });

  return {
    icon: data.project?.icon?.trim() || null,
    color: data.project?.color?.trim() || null,
  };
}

/** Uses the earliest year-named project on the team (e.g. 2026) as the icon/color template. */
export async function resolveWorkoutYearProjectTemplate(
  teamId: string,
): Promise<WorkoutYearProjectStyle | null> {
  const id = teamId.trim();
  if (!id) return null;

  const yearProjects = sortWorkoutYearProjects(await fetchLinearTeamProjects(id));
  if (yearProjects.length === 0) return null;

  for (const project of yearProjects) {
    const style = await fetchWorkoutYearProjectStyle(project.id);
    if (style.icon || style.color) return style;
  }

  return fetchWorkoutYearProjectStyle(yearProjects[0]!.id);
}
