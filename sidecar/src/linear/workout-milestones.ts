import { createLinearTeamProject, fetchLinearTeamProjects } from "./team-projects.ts";
import { linearGraphqlRequest } from "./graphql.ts";
import {
  isWorkoutYearProjectName,
  resolveWorkoutYearProjectTemplate,
} from "./workout-project-template.ts";

export type WorkoutMilestoneRecord = {
  id: string;
  name: string;
  targetDate: string | null;
  projectId: string;
  status: string | null;
  progress: number | null;
};

const PROJECT_MILESTONES_QUERY = `
  query BacksterWorkoutMilestones($projectId: String!) {
    project(id: $projectId) {
      projectMilestones(first: 250, includeArchived: false) {
        nodes {
          id
          name
          targetDate
          status
          progress
        }
      }
    }
  }
`;

const MILESTONE_CREATE_MUTATION = `
  mutation BacksterWorkoutMilestoneCreate($input: ProjectMilestoneCreateInput!) {
    projectMilestoneCreate(input: $input) {
      success
      projectMilestone {
        id
        name
        targetDate
        status
        progress
        project {
          id
        }
      }
    }
  }
`;

type GraphqlMilestoneNode = {
  id?: string | null;
  name?: string | null;
  targetDate?: string | null;
  status?: string | null;
  progress?: number | null;
  project?: { id?: string | null } | null;
};

function normalizeMilestone(
  node: GraphqlMilestoneNode,
  fallbackProjectId: string,
): WorkoutMilestoneRecord | null {
  const id = node.id?.trim();
  const name = node.name?.trim();
  if (!id || !name) return null;
  const projectId = node.project?.id?.trim() || fallbackProjectId;
  const targetDate = node.targetDate?.trim() || null;
  const status = node.status?.trim() || null;
  const progress =
    typeof node.progress === "number" && Number.isFinite(node.progress) ? node.progress : null;
  return { id, name, targetDate, projectId, status, progress };
}

function assertWorkoutDateKey(dateKey: string): string {
  const trimmed = dateKey.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("Invalid workout date");
  }
  return trimmed;
}

function workoutProjectNameForYear(year: number): string {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new Error("Invalid workout year");
  }
  return String(year);
}

function parseYearFromDateKey(dateKey: string): number {
  return Number.parseInt(assertWorkoutDateKey(dateKey).slice(0, 4), 10);
}

function sortWorkoutMilestones(milestones: WorkoutMilestoneRecord[]): WorkoutMilestoneRecord[] {
  return milestones.sort((left, right) => {
    const leftDate = left.targetDate ?? "";
    const rightDate = right.targetDate ?? "";
    if (leftDate !== rightDate) return rightDate.localeCompare(leftDate);
    return left.name.localeCompare(right.name);
  });
}

async function fetchMilestonesForProject(projectId: string): Promise<WorkoutMilestoneRecord[]> {
  const data = await linearGraphqlRequest<{
    project?: {
      projectMilestones?: {
        nodes?: GraphqlMilestoneNode[] | null;
      } | null;
    } | null;
  }>(PROJECT_MILESTONES_QUERY, { projectId });

  const milestones: WorkoutMilestoneRecord[] = [];
  for (const node of data.project?.projectMilestones?.nodes ?? []) {
    const milestone = normalizeMilestone(node, projectId);
    if (milestone) milestones.push(milestone);
  }

  return milestones;
}

export async function resolveWorkoutsProjectId(teamId: string, year: number): Promise<string> {
  const id = teamId.trim();
  if (!id) {
    throw new Error("teamId is required");
  }

  const projectName = workoutProjectNameForYear(year);
  const projects = await fetchLinearTeamProjects(id);
  const named = projects.find(
    (project) => project.name.localeCompare(projectName, undefined, { sensitivity: "base" }) === 0,
  );
  if (named) return named.id;

  const template = await resolveWorkoutYearProjectTemplate(id);
  const created = await createLinearTeamProject(id, projectName, {
    icon: template?.icon,
    color: template?.color,
  });
  return created.id;
}

export async function fetchWorkoutMilestones(teamId: string): Promise<WorkoutMilestoneRecord[]> {
  const id = teamId.trim();
  if (!id) {
    throw new Error("teamId is required");
  }

  const projects = await fetchLinearTeamProjects(id);
  const yearProjects = projects.filter((project) => isWorkoutYearProjectName(project.name));

  const milestones: WorkoutMilestoneRecord[] = [];
  for (const project of yearProjects) {
    const projectMilestones = await fetchMilestonesForProject(project.id);
    milestones.push(...projectMilestones);
  }

  return sortWorkoutMilestones(milestones);
}

export async function createWorkoutMilestoneForDate(
  teamId: string,
  dateKey: string,
): Promise<WorkoutMilestoneRecord> {
  const normalizedDate = assertWorkoutDateKey(dateKey);
  const year = parseYearFromDateKey(normalizedDate);
  const projectId = await resolveWorkoutsProjectId(teamId, year);
  const existing = (await fetchMilestonesForProject(projectId)).find(
    (milestone) => milestone.targetDate === normalizedDate,
  );
  if (existing) return existing;

  const data = await linearGraphqlRequest<{
    projectMilestoneCreate?: {
      success?: boolean;
      projectMilestone?: GraphqlMilestoneNode | null;
    } | null;
  }>(MILESTONE_CREATE_MUTATION, {
    input: {
      projectId,
      name: normalizedDate,
      targetDate: normalizedDate,
    },
  });

  if (!data.projectMilestoneCreate?.success) {
    throw new Error("Failed to create workout session milestone");
  }

  const milestone = normalizeMilestone(data.projectMilestoneCreate.projectMilestone ?? {}, projectId);
  if (!milestone) {
    throw new Error("Linear returned no workout session milestone");
  }

  return milestone;
}

export async function findWorkoutMilestoneForDate(
  teamId: string,
  dateKey: string,
): Promise<WorkoutMilestoneRecord | null> {
  const normalizedDate = assertWorkoutDateKey(dateKey);
  const year = parseYearFromDateKey(normalizedDate);
  const projectId = await resolveWorkoutsProjectId(teamId, year);
  return (
    (await fetchMilestonesForProject(projectId)).find(
      (milestone) => milestone.targetDate === normalizedDate,
    ) ?? null
  );
}
