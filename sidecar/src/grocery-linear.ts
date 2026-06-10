import { runLlmExtract, type GroceryItemExtract } from "./llm-extract/index.ts";
import { mergeGroceryItemsIntoDescription } from "./grocery-checkbox-lines.ts";
import { formatGroceryItemLabel } from "./llm-extract/tasks/grocery-items.ts";
import { linearGraphqlRequest } from "./linear/graphql.ts";
import { loadLinearWorkflowConfig } from "./linear/project-config.ts";
import {
  fetchLinearProjectContext,
  fetchLinearViewerId,
  resolveWorkflowStateId,
} from "./linear/project-context.ts";
import { resolveTaskLabelId } from "./linear/projects.ts";
import { traceGroceryLinear } from "./grocery-linear-trace.ts";
import {
  formatGroceryWeekTitle,
  normalizeGroceryWeekNumber,
  resolveGroceryWeekContext,
  type GroceryWeekContext,
} from "./grocery-week.ts";
import { loadSettings } from "./store.ts";
import { getExecutionMode } from "./execution-mode.ts";

export type GroceryLinearItem = {
  name: string;
  quantity?: string;
  note?: string;
};

export type GroceryLinearResult = {
  /** Items extracted from the current message (for confirmation; not merged totals). */
  added: GroceryLinearItem[];
  week: GroceryWeekContext;
  issueId: string;
  issueIdentifier?: string;
  issueUrl?: string;
  createdIssue: boolean;
  projectName?: string;
  teamName?: string;
};

const FIND_GROCERY_ISSUE_QUERY = `
  query GroceryWeekIssue($filter: IssueFilter, $after: String) {
    issues(filter: $filter, first: 5, after: $after) {
      nodes {
        id
        identifier
        title
        dueDate
        url
        description
      }
    }
  }
`;

const ISSUE_CREATE_MUTATION = `
  mutation GroceryIssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        identifier
        title
        dueDate
        url
        description
      }
    }
  }
`;

const ISSUE_UPDATE_MUTATION = `
  mutation GroceryIssueUpdate($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) {
      success
      issue {
        id
        identifier
        description
      }
    }
  }
`;

async function findGroceryWeekIssue(
  projectId: string,
  week: number,
  dueDate: string,
): Promise<{
  id: string;
  identifier?: string;
  url?: string;
  description?: string;
} | null> {
  const title = formatGroceryWeekTitle(week);
  traceGroceryLinear("find_issue", "Searching for weekly grocery issue", {
    projectId,
    title,
    dueDate,
  });

  const data = await linearGraphqlRequest<{
    issues?: {
      nodes?: Array<{
        id?: string;
        identifier?: string;
        title?: string;
        dueDate?: string;
        url?: string;
        description?: string;
      }>;
    };
  }>(FIND_GROCERY_ISSUE_QUERY, {
    filter: {
      project: { id: { eq: projectId } },
      title: { eq: title },
      dueDate: { eq: dueDate },
    },
    after: null,
  });

  const node = data.issues?.nodes?.[0];
  if (!node?.id) {
    traceGroceryLinear("find_issue", "No existing weekly grocery issue found", { title, dueDate });
    return null;
  }

  traceGroceryLinear("find_issue", "Found existing weekly grocery issue", {
    issueId: node.id,
    identifier: node.identifier,
    url: node.url,
  });

  return {
    id: node.id,
    identifier: node.identifier,
    url: node.url,
    description: node.description,
  };
}

async function createGroceryWeekIssue(
  projectId: string,
  weekContext: GroceryWeekContext,
  taskLabelId?: string,
): Promise<{
  id: string;
  identifier?: string;
  url?: string;
  description?: string;
  projectName?: string;
  teamName?: string;
}> {
  const projectContext = await fetchLinearProjectContext(projectId);
  const title = formatGroceryWeekTitle(weekContext.week);
  const stateId = weekContext.isCurrentWeek
    ? resolveWorkflowStateId(projectContext.states, ["In Progress", "Started"], "started")
    : resolveWorkflowStateId(
        projectContext.states,
        ["Ready to Start", "Todo", "Backlog"],
        "unstarted",
      );

  if (!stateId) {
    throw new Error(
      `Could not resolve a workflow state for ${projectContext.teamName ?? "the project team"}`,
    );
  }

  const config = loadLinearWorkflowConfig();
  const assigneeId = (await fetchLinearViewerId()) ?? config.defaults.assigneeId;

  const input = {
    teamId: projectContext.teamId,
    projectId: projectContext.projectId,
    title,
    dueDate: weekContext.dueDate,
    assigneeId,
    priority: config.defaults.priority,
    estimate: 2,
    stateId,
    labelIds: taskLabelId ? [taskLabelId] : undefined,
  };

  traceGroceryLinear("create_issue", "Creating weekly grocery issue in Linear", {
    projectName: projectContext.projectName,
    teamName: projectContext.teamName,
    teamId: projectContext.teamId,
    title,
    dueDate: weekContext.dueDate,
    stateId,
    assigneeId,
    hasTaskLabel: Boolean(taskLabelId),
  });

  const data = await linearGraphqlRequest<{
    issueCreate: {
      success: boolean;
      issue?: {
        id?: string;
        identifier?: string;
        url?: string;
        description?: string;
      } | null;
    };
  }>(ISSUE_CREATE_MUTATION, { input });

  if (!data.issueCreate.success || !data.issueCreate.issue?.id) {
    traceGroceryLinear("create_issue", "Linear issueCreate returned unsuccessful result", {
      success: data.issueCreate.success,
      title,
    });
    throw new Error(`Linear did not create grocery issue for ${title}`);
  }

  traceGroceryLinear("create_issue", "Created weekly grocery issue in Linear", {
    issueId: data.issueCreate.issue.id,
    identifier: data.issueCreate.issue.identifier,
    url: data.issueCreate.issue.url,
  });

  return {
    id: data.issueCreate.issue.id,
    identifier: data.issueCreate.issue.identifier,
    url: data.issueCreate.issue.url,
    description: data.issueCreate.issue.description,
    projectName: projectContext.projectName,
    teamName: projectContext.teamName,
  };
}

async function updateIssueDescription(issueId: string, description: string): Promise<void> {
  traceGroceryLinear("update_issue", "Updating grocery issue description", {
    issueId,
    lineCount: description.split("\n").length,
  });

  const data = await linearGraphqlRequest<{
    issueUpdate: { success: boolean };
  }>(ISSUE_UPDATE_MUTATION, {
    id: issueId,
    input: { description },
  });

  if (!data.issueUpdate.success) {
    traceGroceryLinear("update_issue", "Linear issueUpdate returned unsuccessful result", { issueId });
    throw new Error(`Linear did not update grocery issue ${issueId}`);
  }

  traceGroceryLinear("update_issue", "Updated grocery issue description", { issueId });
}

function resolveGroceryProjectId(override?: string | null): string {
  const projectId = override?.trim() || loadSettings().groceryLinearProjectId?.trim();
  if (!projectId) {
    throw new Error(
      "Grocery Linear project is not configured. Choose a project in Settings → Linear.",
    );
  }
  return projectId;
}

export async function addGroceryItemsToLinear(
  message: string,
  options: {
    groceryWeek?: string;
    projectId?: string | null;
    now?: Date;
    extracted?: GroceryItemExtract[];
  } = {},
): Promise<GroceryLinearResult> {
  const trimmed = message.trim();
  if (!trimmed) {
    throw new Error("Grocery list message is empty");
  }

  const executionMode = getExecutionMode();
  const weekContext = resolveGroceryWeekContext(options.groceryWeek, options.now);

  traceGroceryLinear("start", "Grocery Linear flow started", {
    executionMode,
    week: weekContext.week,
    dueDate: weekContext.dueDate,
    isCurrentWeek: weekContext.isCurrentWeek,
    messagePreview: trimmed.slice(0, 120),
  });

  let extractedItems: GroceryItemExtract[];
  try {
    const extracted =
      options.extracted ??
      (await runLlmExtract<{ items: GroceryItemExtract[] }>("grocery-items", trimmed));
    extractedItems = extracted.items;
    traceGroceryLinear("extract", "Extracted grocery items", {
      count: extractedItems.length,
      items: extractedItems.map((item) => item.name),
    });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Grocery extraction failed";
    traceGroceryLinear("extract", "Grocery extraction failed", { error: messageText });
    throw error;
  }

  const projectId = resolveGroceryProjectId(options.projectId);
  const projectContext = await fetchLinearProjectContext(projectId);
  const taskLabelId = await resolveTaskLabelId(projectContext.teamId);

  traceGroceryLinear("project", "Resolved grocery Linear project", {
    projectId: projectContext.projectId,
    projectName: projectContext.projectName,
    teamId: projectContext.teamId,
    teamName: projectContext.teamName,
    taskLabelResolved: Boolean(taskLabelId),
  });

  let issue = await findGroceryWeekIssue(projectContext.projectId, weekContext.week, weekContext.dueDate);
  let createdIssue = false;
  let projectName = projectContext.projectName;
  let teamName = projectContext.teamName;

  if (!issue) {
    const created = await createGroceryWeekIssue(projectContext.projectId, weekContext, taskLabelId);
    issue = created;
    createdIssue = true;
    projectName = created.projectName ?? projectName;
    teamName = created.teamName ?? teamName;
  }

  const existingDescription = issue.description ?? "";
  traceGroceryLinear("append", "Loaded existing grocery issue description", {
    issueId: issue.id,
    identifier: issue.identifier,
    existingLineCount: existingDescription.split("\n").filter(Boolean).length,
    hasExistingItems: existingDescription.includes("- ["),
  });

  const { description, added: mergedItems, changed } = mergeGroceryItemsIntoDescription(
    existingDescription,
    extractedItems,
  );

  traceGroceryLinear("append", "Prepared grocery checkbox lines", {
    extractedCount: extractedItems.length,
    mergedCount: mergedItems.length,
    changed,
    createdIssue,
    issueId: issue.id,
    identifier: issue.identifier,
    extractedItems: extractedItems.map((item) => formatGroceryItemLabel(item)),
    mergedItems: mergedItems.map((item) => formatGroceryItemLabel(item)),
  });

  if (changed) {
    await updateIssueDescription(issue.id, description);
  } else {
    traceGroceryLinear("append", "No grocery description changes", {
      issueId: issue.id,
      identifier: issue.identifier,
    });
  }

  const result: GroceryLinearResult = {
    added: extractedItems,
    week: weekContext,
    issueId: issue.id,
    issueIdentifier: issue.identifier,
    issueUrl: issue.url,
    createdIssue,
    projectName,
    teamName,
  };

  traceGroceryLinear("complete", "Grocery Linear flow completed", {
    addedCount: extractedItems.length,
    createdIssue,
    issueId: result.issueId,
    identifier: result.issueIdentifier,
    url: result.issueUrl,
  });

  return result;
}

export function normalizeGroceryWeekForAutomation(value?: string): string | undefined {
  if (!value?.trim()) return undefined;
  const week = normalizeGroceryWeekNumber(value);
  if (!week) {
    throw new Error("Grocery week number must be between 1 and 53");
  }
  return String(week);
}
