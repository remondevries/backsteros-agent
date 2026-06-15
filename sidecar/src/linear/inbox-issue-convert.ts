import { createLinearIssueComment } from "./issue-comments.ts";
import { fetchLinearIssueDetail, updateLinearIssueDetail } from "./issue-detail.ts";
import { linearGraphqlRequest } from "./graphql.ts";
import {
  fetchLinearProjectContext,
  resolveWorkflowStateId,
  type LinearWorkflowState,
} from "./project-context.ts";

export type ConvertInboxIssueResult = {
  sourceIssue: {
    id: string;
    identifier: string;
    url: string;
  };
  newIssue: {
    id: string;
    identifier: string;
    url: string;
    projectId: string;
    projectName: string;
  };
};

const ISSUE_CREATE_MUTATION = `
  mutation ConvertInboxIssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        identifier
        url
        title
      }
    }
  }
`;

const ISSUE_RELATION_CREATE_MUTATION = `
  mutation ConvertInboxIssueRelation($input: IssueRelationCreateInput!) {
    issueRelationCreate(input: $input) {
      success
      issueRelation {
        id
        type
      }
    }
  }
`;

function workflowStatesFromIssueDetail(
  states: Array<{ id: string; name: string; type: string }>,
): LinearWorkflowState[] {
  return states.map((state) => ({
    id: state.id,
    name: state.name,
    type: state.type,
  }));
}

async function createProjectTaskIssue(options: {
  teamId: string;
  projectId: string;
  title: string;
  description: string;
  stateId: string;
  priority: number;
  assigneeId: string | null;
  dueDate: string | null;
  estimate: number | null;
}): Promise<{ id: string; identifier: string; url: string; title: string }> {
  const input: Record<string, unknown> = {
    teamId: options.teamId,
    projectId: options.projectId,
    title: options.title,
    description: options.description,
    stateId: options.stateId,
    priority: options.priority,
  };

  if (options.assigneeId) {
    input.assigneeId = options.assigneeId;
  }
  if (options.dueDate) {
    input.dueDate = options.dueDate;
  }
  if (options.estimate != null) {
    input.estimate = options.estimate;
  }

  const data = await linearGraphqlRequest<{
    issueCreate?: {
      success?: boolean;
      issue?: {
        id?: string;
        identifier?: string;
        url?: string;
        title?: string;
      } | null;
    } | null;
  }>(ISSUE_CREATE_MUTATION, { input });

  const issue = data.issueCreate?.issue;
  const id = issue?.id?.trim();
  const identifier = issue?.identifier?.trim();
  const url = issue?.url?.trim();
  const title = issue?.title?.trim();

  if (!data.issueCreate?.success || !id || !identifier || !url || !title) {
    throw new Error("Linear did not create the project task");
  }

  return { id, identifier, url, title };
}

async function linkRelatedIssues(issueId: string, relatedIssueId: string): Promise<void> {
  const data = await linearGraphqlRequest<{
    issueRelationCreate?: { success?: boolean } | null;
  }>(ISSUE_RELATION_CREATE_MUTATION, {
    input: {
      issueId,
      relatedIssueId,
      type: "related",
    },
  });

  if (!data.issueRelationCreate?.success) {
    throw new Error("Linear did not link the converted issues");
  }
}

export async function convertInboxIssueToProjectTask(
  sourceIssueId: string,
  targetProjectId: string,
  overrides?: {
    title?: string;
    description?: string | null;
  },
): Promise<ConvertInboxIssueResult> {
  const sourceId = sourceIssueId.trim();
  const projectId = targetProjectId.trim();
  if (!sourceId) {
    throw new Error("sourceIssueId is required");
  }
  if (!projectId) {
    throw new Error("projectId is required");
  }

  const sourceIssue = await fetchLinearIssueDetail(sourceId);
  if (!sourceIssue) {
    throw new Error("Issue not found");
  }

  const completedStateId = resolveWorkflowStateId(
    workflowStatesFromIssueDetail(sourceIssue.workflowStates),
    ["Done", "Completed", "Complete"],
    "completed",
  );
  if (!completedStateId) {
    throw new Error("Could not resolve a completed workflow state for this issue");
  }

  const targetContext = await fetchLinearProjectContext(projectId);
  const newIssueStateId = resolveWorkflowStateId(
    targetContext.states,
    ["Backlog", "Todo", "Ready to Start"],
    "unstarted",
  );
  if (!newIssueStateId) {
    throw new Error("Could not resolve an initial workflow state for the target project");
  }

  const title = overrides?.title?.trim() || sourceIssue.title.trim();
  if (!title) {
    throw new Error("Issue title is required");
  }

  const descriptionSource =
    overrides && "description" in overrides ? overrides.description : sourceIssue.description;

  const newIssue = await createProjectTaskIssue({
    teamId: targetContext.teamId,
    projectId: targetContext.projectId,
    title,
    description: (descriptionSource ?? "").trim(),
    stateId: newIssueStateId,
    priority: sourceIssue.priority,
    assigneeId: sourceIssue.assigneeId,
    dueDate: sourceIssue.dueDate,
    estimate: sourceIssue.estimate,
  });

  const updatedSource = await updateLinearIssueDetail(sourceId, { stateId: completedStateId });
  if (!updatedSource) {
    throw new Error("Failed to mark the inbox issue as completed");
  }

  await linkRelatedIssues(newIssue.id, sourceIssue.id);

  try {
    await createLinearIssueComment(
      sourceIssue.id,
      `Converted to project task [${newIssue.identifier}](${newIssue.url}) in **${targetContext.projectName}**.`,
    );
  } catch {
    // Relation is the source of truth; comment is supplementary.
  }

  return {
    sourceIssue: {
      id: sourceIssue.id,
      identifier: sourceIssue.identifier,
      url: sourceIssue.url,
    },
    newIssue: {
      id: newIssue.id,
      identifier: newIssue.identifier,
      url: newIssue.url,
      projectId: targetContext.projectId,
      projectName: targetContext.projectName,
    },
  };
}
