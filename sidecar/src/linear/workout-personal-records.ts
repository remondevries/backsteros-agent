import { fetchLinearTeamContext, resolveWorkflowStateId } from "./project-context.ts";
import { linearGraphqlRequest } from "./graphql.ts";
import { updateLinearIssueDetail } from "./issue-detail.ts";
import { resolveWorkoutSetExerciseLabel } from "./workout-exercise-types.ts";
import {
  createLinearTeamProject,
  fetchLinearTeamProjects,
} from "./team-projects.ts";
import { WORKOUT_REP_WEIGHT_PLACEHOLDER } from "./workout-sessions.ts";

export const WORKOUT_PERSONAL_RECORDS_PROJECT_NAME = "Personal Records";

const REP_CONTEXT_QUERY = `
  query BacksterWorkoutRepContext($issueId: String!) {
    issue(id: $issueId) {
      id
      title
      parent {
        id
        title
      }
      team {
        id
      }
    }
  }
`;

const PERSONAL_RECORDS_ISSUES_QUERY = `
  query BacksterPersonalRecordsIssues($projectId: String!) {
    project(id: $projectId) {
      issues(first: 250) {
        nodes {
          id
          title
          labels(first: 20) {
            nodes {
              id
              name
            }
          }
        }
      }
    }
  }
`;

const ISSUE_CREATE_MUTATION = `
  mutation BacksterPersonalRecordIssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        title
      }
    }
  }
`;

export function parseWorkoutRepWeightKg(title: string): number | null {
  const trimmed = title.trim();
  if (!trimmed || trimmed === WORKOUT_REP_WEIGHT_PLACEHOLDER || trimmed.startsWith("Set ")) {
    return null;
  }
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export function formatWorkoutPersonalRecordTitle(weightKg: number): string {
  if (Number.isInteger(weightKg)) {
    return String(weightKg);
  }
  return String(parseFloat(weightKg.toFixed(2)));
}

export function shouldReplacePersonalRecordTitle(
  existingTitle: string,
  nextWeightKg: number,
): boolean {
  const existingWeight = parseWorkoutRepWeightKg(existingTitle);
  if (existingWeight == null) {
    return true;
  }
  return nextWeightKg > existingWeight;
}

async function resolvePersonalRecordsProjectId(teamId: string): Promise<string> {
  const projects = await fetchLinearTeamProjects(teamId);
  const match = projects.find(
    (project) =>
      project.name.localeCompare(WORKOUT_PERSONAL_RECORDS_PROJECT_NAME, undefined, {
        sensitivity: "base",
      }) === 0,
  );
  if (match) {
    return match.id;
  }

  const created = await createLinearTeamProject(teamId, WORKOUT_PERSONAL_RECORDS_PROJECT_NAME);
  return created.id;
}

async function resolveExerciseSetLabelId(
  teamId: string,
  exerciseName: string,
): Promise<{ id: string; name: string }> {
  return resolveWorkoutSetExerciseLabel(teamId, exerciseName);
}

type PersonalRecordIssueNode = {
  id?: string | null;
  title?: string | null;
  labels?: {
    nodes?: Array<{ id?: string | null; name?: string | null } | null> | null;
  } | null;
};

async function findPersonalRecordIssueForExercise(
  projectId: string,
  exerciseLabelId: string,
): Promise<{ id: string; title: string } | null> {
  const data = await linearGraphqlRequest<{
    project?: {
      issues?: {
        nodes?: PersonalRecordIssueNode[] | null;
      } | null;
    } | null;
  }>(PERSONAL_RECORDS_ISSUES_QUERY, { projectId });

  let bestMatch: { id: string; title: string; weight: number } | null = null;

  for (const node of data.project?.issues?.nodes ?? []) {
    const id = node.id?.trim();
    const title = node.title?.trim();
    if (!id || !title) continue;

    const labelIds = (node.labels?.nodes ?? [])
      .map((label) => label?.id?.trim())
      .filter((labelId): labelId is string => Boolean(labelId));
    if (!labelIds.includes(exerciseLabelId)) continue;

    const weight = parseWorkoutRepWeightKg(title) ?? 0;
    if (!bestMatch || weight >= bestMatch.weight) {
      bestMatch = { id, title, weight };
    }
  }

  return bestMatch ? { id: bestMatch.id, title: bestMatch.title } : null;
}

async function createPersonalRecordIssue(input: {
  teamId: string;
  projectId: string;
  title: string;
  labelId: string;
}): Promise<void> {
  const teamContext = await fetchLinearTeamContext(input.teamId);
  const stateId =
    resolveWorkflowStateId(teamContext.states, ["Done", "Completed"], "completed") ??
    resolveWorkflowStateId(teamContext.states, ["Backlog", "Triage"], "unstarted");
  if (!stateId) {
    throw new Error("Could not resolve a workflow state for personal record issues");
  }

  const data = await linearGraphqlRequest<{
    issueCreate?: {
      success?: boolean;
    } | null;
  }>(ISSUE_CREATE_MUTATION, {
    input: {
      teamId: input.teamId,
      projectId: input.projectId,
      title: input.title,
      labelIds: [input.labelId],
      stateId,
    },
  });

  if (!data.issueCreate?.success) {
    throw new Error("Failed to create personal record issue");
  }
}

export async function syncWorkoutPersonalRecordForRepWeight(
  repIssueId: string,
  weightTitle: string,
): Promise<void> {
  const id = repIssueId.trim();
  const nextWeightKg = parseWorkoutRepWeightKg(weightTitle);
  if (!id || nextWeightKg == null) {
    return;
  }

  const contextData = await linearGraphqlRequest<{
    issue?: {
      id?: string | null;
      parent?: { id?: string | null; title?: string | null } | null;
      team?: { id?: string | null } | null;
    } | null;
  }>(REP_CONTEXT_QUERY, { issueId: id });

  const parentTitle = contextData.issue?.parent?.title?.trim();
  const teamId = contextData.issue?.team?.id?.trim();
  if (!parentTitle || !teamId) {
    return;
  }

  const exerciseLabel = await resolveExerciseSetLabelId(teamId, parentTitle);
  const projectId = await resolvePersonalRecordsProjectId(teamId);
  const recordTitle = formatWorkoutPersonalRecordTitle(nextWeightKg);

  const existing = await findPersonalRecordIssueForExercise(projectId, exerciseLabel.id);
  if (!existing) {
    await createPersonalRecordIssue({
      teamId,
      projectId,
      title: recordTitle,
      labelId: exerciseLabel.id,
    });
    return;
  }

  if (!shouldReplacePersonalRecordTitle(existing.title, nextWeightKg)) {
    return;
  }

  await updateLinearIssueDetail(existing.id, { title: recordTitle });
}
