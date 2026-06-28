import { fetchLinearTeamContext, resolveWorkflowStateId } from "./project-context.ts";
import { linearGraphqlRequest } from "./graphql.ts";
import {
  createWorkoutMilestoneForDate,
  findWorkoutMilestoneForDate,
  resolveWorkoutsProjectId,
} from "./workout-milestones.ts";
import { assertWorkoutSetExercise, resolveWorkoutSetExerciseLabel } from "./workout-exercise-types.ts";

export type WorkoutRepRecord = {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  reps: number | null;
  labels: { id: string; name: string; color: string }[];
};

export type WorkoutGroupSetRecord = {
  id: string;
  identifier: string;
  title: string;
  dueDate: string | null;
  status: string;
  stateId: string | null;
  stateType?: string;
  statusColor?: string;
  exercise: string | null;
  reps: WorkoutRepRecord[];
  createdAt: string | null;
};

export type WorkoutSessionRecord = {
  date: string;
  projectId: string;
  milestoneId: string;
  groupSets: WorkoutGroupSetRecord[];
};

const WORKOUT_SESSION_QUERY = `
  query BacksterWorkoutSession($milestoneId: String!) {
    projectMilestone(id: $milestoneId) {
      id
      targetDate
      issues(first: 250, filter: { parent: { null: true } }) {
        nodes {
          id
          identifier
          title
          dueDate
          createdAt
          state {
            id
            name
            type
            color
          }
          children(first: 100) {
            nodes {
              id
              identifier
              title
              description
              labels {
                nodes {
                  id
                  name
                  color
                }
              }
            }
          }
        }
      }
    }
  }
`;

const ISSUE_CREATE_MUTATION = `
  mutation BacksterWorkoutIssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        identifier
        title
        description
        dueDate
        createdAt
        labels {
          nodes {
            id
            name
            color
          }
        }
        state {
          id
          name
          type
          color
        }
        children(first: 100) {
          nodes {
            id
            identifier
            title
            description
            labels {
              nodes {
                id
                name
                color
              }
            }
          }
        }
      }
    }
  }
`;

type GraphqlWorkoutLabelNode = {
  id?: string | null;
  name?: string | null;
  color?: string | null;
};

type GraphqlWorkoutIssueNode = {
  id?: string | null;
  identifier?: string | null;
  title?: string | null;
  description?: string | null;
  dueDate?: string | null;
  createdAt?: string | null;
  labels?: {
    nodes?: GraphqlWorkoutLabelNode[] | null;
  } | null;
  state?: {
    id?: string | null;
    name?: string | null;
    type?: string | null;
    color?: string | null;
  } | null;
  children?: {
    nodes?: GraphqlWorkoutIssueNode[] | null;
  } | null;
};

function assertWorkoutDateKey(dateKey: string): string {
  const trimmed = dateKey.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("Invalid workout date");
  }
  return trimmed;
}

function parseYearFromDateKey(dateKey: string): number {
  return Number.parseInt(assertWorkoutDateKey(dateKey).slice(0, 4), 10);
}

function parseRepsFromDescription(description: string | null | undefined): number | null {
  const trimmed = description?.trim();
  if (!trimmed) return null;
  const direct = Number.parseInt(trimmed, 10);
  if (Number.isFinite(direct)) return direct;
  const match = /^(\d+)\s*reps?$/i.exec(trimmed);
  if (!match) return null;
  const parsed = Number.parseInt(match[1]!, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatSetTitle(setNumber: number): string {
  return `Set ${setNumber}`;
}

export const WORKOUT_REP_WEIGHT_PLACEHOLDER = "Weight";

function formatRepTitleForCreate(options: { blankWeight?: boolean; setNumber: number }): string {
  if (options.blankWeight) {
    return WORKOUT_REP_WEIGHT_PLACEHOLDER;
  }
  return formatSetTitle(options.setNumber);
}

function mapLabelNode(node: GraphqlWorkoutLabelNode): { id: string; name: string; color: string } | null {
  const id = node.id?.trim();
  const name = node.name?.trim();
  if (!id || !name) return null;
  const color = node.color?.trim();
  return {
    id,
    name,
    color: color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#93A2B6",
  };
}

function mapRepNode(node: GraphqlWorkoutIssueNode): WorkoutRepRecord | null {
  const id = node.id?.trim();
  const identifier = node.identifier?.trim();
  const title = node.title?.trim();
  if (!id || !identifier || !title) return null;
  const description = node.description?.trim() || null;
  const labels = (node.labels?.nodes ?? [])
    .map((entry) => mapLabelNode(entry ?? {}))
    .filter((entry): entry is { id: string; name: string; color: string } => Boolean(entry));
  const repsFromLabel = labels.length > 0 ? parseRepsFromDescription(labels[0]!.name) : null;
  return {
    id,
    identifier,
    title,
    description,
    reps: repsFromLabel ?? parseRepsFromDescription(description),
    labels,
  };
}

function mapGroupSetNode(node: GraphqlWorkoutIssueNode): WorkoutGroupSetRecord | null {
  const id = node.id?.trim();
  const identifier = node.identifier?.trim();
  const title = (node.title ?? "Untitled").trim() || "Untitled";
  if (!id || !identifier) return null;

  const reps = (node.children?.nodes ?? [])
    .map((child) => mapRepNode(child))
    .filter((entry): entry is WorkoutRepRecord => Boolean(entry));

  return {
    id,
    identifier,
    title,
    dueDate: node.dueDate?.trim() || null,
    status: (node.state?.name ?? "Unknown").trim() || "Unknown",
    stateId: node.state?.id?.trim() || null,
    stateType: node.state?.type?.trim() || undefined,
    statusColor: node.state?.color?.trim() || undefined,
    exercise: title,
    reps,
    createdAt: node.createdAt?.trim() || null,
  };
}

async function resolveWorkoutSessionContext(teamId: string, dateKey: string) {
  const normalizedDate = assertWorkoutDateKey(dateKey);
  const year = parseYearFromDateKey(normalizedDate);
  const [projectId, milestone, teamContext] = await Promise.all([
    resolveWorkoutsProjectId(teamId, year),
    createWorkoutMilestoneForDate(teamId, normalizedDate),
    fetchLinearTeamContext(teamId),
  ]);

  const inProgressStateId = resolveWorkflowStateId(
    teamContext.states,
    ["In Progress", "Started"],
    "started",
  );
  if (!inProgressStateId) {
    throw new Error("Could not resolve an In Progress workflow state for this team");
  }

  return {
    date: normalizedDate,
    projectId,
    milestoneId: milestone.id,
    teamId: teamContext.teamId,
    inProgressStateId,
  };
}

async function fetchGroupSetsForMilestone(milestoneId: string): Promise<WorkoutGroupSetRecord[]> {
  const data = await linearGraphqlRequest<{
    projectMilestone?: {
      issues?: {
        nodes?: GraphqlWorkoutIssueNode[] | null;
      } | null;
    } | null;
  }>(WORKOUT_SESSION_QUERY, { milestoneId });

  const groupSets: WorkoutGroupSetRecord[] = [];
  for (const node of data.projectMilestone?.issues?.nodes ?? []) {
    const groupSet = mapGroupSetNode(node);
    if (groupSet) groupSets.push(groupSet);
  }

  return groupSets.sort((left, right) => {
    const leftCreated = left.createdAt ?? "";
    const rightCreated = right.createdAt ?? "";
    if (leftCreated !== rightCreated) return rightCreated.localeCompare(leftCreated);
    return left.title.localeCompare(right.title);
  });
}

function findActiveGroupSetForExercise(
  groupSets: WorkoutGroupSetRecord[],
  exercise: string,
  dateKey: string,
  inProgressStateId: string,
): WorkoutGroupSetRecord | null {
  const normalizedExercise = exercise.trim().toLowerCase();
  return (
    groupSets.find((groupSet) => {
      if (groupSet.stateId !== inProgressStateId) return false;
      if (groupSet.dueDate !== dateKey) return false;
      return groupSet.title.trim().toLowerCase() === normalizedExercise;
    }) ?? null
  );
}

export async function fetchWorkoutSession(
  teamId: string,
  dateKey: string,
): Promise<WorkoutSessionRecord> {
  const context = await resolveWorkoutSessionContext(teamId, dateKey);
  const groupSets = await fetchGroupSetsForMilestone(context.milestoneId);
  return {
    date: context.date,
    projectId: context.projectId,
    milestoneId: context.milestoneId,
    groupSets,
  };
}

export async function fetchWorkoutSubIssueCountForDate(
  teamId: string,
  dateKey: string,
): Promise<number> {
  const milestone = await findWorkoutMilestoneForDate(teamId, dateKey);
  if (!milestone) return 0;
  const groupSets = await fetchGroupSetsForMilestone(milestone.id);
  return groupSets.reduce((total, groupSet) => total + groupSet.reps.length, 0);
}

export async function createWorkoutGroupSet(
  teamId: string,
  dateKey: string,
  exercise: string,
): Promise<WorkoutGroupSetRecord> {
  const workoutExercise = await resolveWorkoutSetExerciseLabel(teamId, exercise);
  const context = await resolveWorkoutSessionContext(teamId, dateKey);

  const data = await linearGraphqlRequest<{
    issueCreate?: {
      success?: boolean;
      issue?: GraphqlWorkoutIssueNode | null;
    } | null;
  }>(ISSUE_CREATE_MUTATION, {
    input: {
      teamId: context.teamId,
      title: workoutExercise.name,
      labelIds: [workoutExercise.id],
      dueDate: context.date,
      stateId: context.inProgressStateId,
      projectId: context.projectId,
      projectMilestoneId: context.milestoneId,
    },
  });

  const groupSet = mapGroupSetNode(data.issueCreate?.issue ?? {});
  if (!data.issueCreate?.success || !groupSet) {
    throw new Error("Failed to create workout group set");
  }

  return groupSet;
}

export async function appendWorkoutRep(
  teamId: string,
  dateKey: string,
  input: {
    exercise?: string;
    groupSetId?: string | null;
    blankWeight?: boolean;
  },
): Promise<{ groupSet: WorkoutGroupSetRecord; rep: WorkoutRepRecord }> {
  const context = await resolveWorkoutSessionContext(teamId, dateKey);
  const existingGroupSets = await fetchGroupSetsForMilestone(context.milestoneId);

  let groupSet: WorkoutGroupSetRecord | null = null;

  if (input.groupSetId) {
    groupSet = existingGroupSets.find((entry) => entry.id === input.groupSetId) ?? null;
    if (!groupSet) {
      throw new Error("Group set not found");
    }
  } else {
    const exercise = await assertWorkoutSetExercise(teamId, input.exercise ?? "");
    groupSet =
      findActiveGroupSetForExercise(
        existingGroupSets,
        exercise,
        context.date,
        context.inProgressStateId,
      ) ?? null;

    if (!groupSet) {
      groupSet = await createWorkoutGroupSet(teamId, dateKey, exercise);
    }
  }

  const setNumber = groupSet.reps.length + 1;
  const data = await linearGraphqlRequest<{
    issueCreate?: {
      success?: boolean;
      issue?: GraphqlWorkoutIssueNode | null;
    } | null;
  }>(ISSUE_CREATE_MUTATION, {
    input: {
      teamId: context.teamId,
      parentId: groupSet.id,
      projectId: context.projectId,
      projectMilestoneId: context.milestoneId,
      title: formatRepTitleForCreate({
        blankWeight: input.blankWeight === true,
        setNumber,
      }),
      description: "",
    },
  });

  const rep = mapRepNode(data.issueCreate?.issue ?? {});
  if (!data.issueCreate?.success || !rep) {
    throw new Error("Failed to create workout rep");
  }

  const refreshedGroupSets = await fetchGroupSetsForMilestone(context.milestoneId);
  const refreshedGroupSet =
    refreshedGroupSets.find((entry) => entry.id === groupSet!.id) ?? {
      ...groupSet,
      reps: [...groupSet.reps, rep],
    };

  return { groupSet: refreshedGroupSet, rep };
}
