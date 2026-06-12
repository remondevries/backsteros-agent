import { linearGraphqlRequest } from "./graphql.ts";

export type LinearProjectOverview = {
  id: string;
  name: string;
  icon: string | null;
  state: string;
  priority: number;
  priorityLabel: string;
  startDate: string | null;
  targetDate: string | null;
  leadName: string | null;
  leadAvatarUrl: string | null;
  summary: string | null;
  description: string | null;
  initiativeNames: string[];
};

const PROJECT_OVERVIEW_QUERY = `
  query BacksterProjectOverview($id: String!) {
    project(id: $id) {
      id
      name
      icon
      priority
      priorityLabel
      startDate
      targetDate
      state
      description
      content
      documentContent {
        content
      }
      status {
        name
      }
      lead {
        name
        displayName
        avatarUrl
      }
      initiatives(first: 20) {
        nodes {
          name
        }
      }
    }
  }
`;

type GraphqlProjectOverviewNode = {
  id?: string;
  name?: string | null;
  icon?: string | null;
  priority?: number | null;
  priorityLabel?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
  state?: string | null;
  description?: string | null;
  content?: string | null;
  documentContent?: { content?: string | null } | null;
  status?: { name?: string | null } | null;
  lead?: {
    name?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
  initiatives?: { nodes?: Array<{ name?: string | null }> } | null;
};

function mapProjectOverviewNode(node: GraphqlProjectOverviewNode): LinearProjectOverview | null {
  const id = node.id?.trim();
  const name = node.name?.trim();
  if (!id || !name) return null;

  const stateLabel = (node.status?.name || node.state || "Unknown").trim() || "Unknown";
  const leadName = (node.lead?.name ?? node.lead?.displayName ?? "").trim() || null;
  const leadAvatarUrl = (node.lead?.avatarUrl ?? "").trim() || null;
  const docContent = (node.documentContent?.content ?? "").trim() || null;
  const projectDesc = typeof node.description === "string" ? node.description.trim() || null : null;
  const summary = projectDesc;
  const contentField = typeof node.content === "string" ? node.content.trim() || null : null;
  const description = docContent ?? contentField ?? projectDesc;
  const initiativeNames = (node.initiatives?.nodes ?? [])
    .map((item) => (item?.name ?? "").trim())
    .filter(Boolean);

  return {
    id,
    name,
    icon: node.icon ?? null,
    state: stateLabel,
    priority: node.priority ?? 0,
    priorityLabel: (node.priorityLabel ?? "").trim(),
    startDate: node.startDate ?? null,
    targetDate: node.targetDate ?? null,
    leadName,
    leadAvatarUrl,
    summary,
    description,
    initiativeNames,
  };
}

export async function fetchLinearProjectOverview(projectId: string): Promise<LinearProjectOverview | null> {
  const id = projectId.trim();
  if (!id) return null;

  const data = await linearGraphqlRequest<{ project?: GraphqlProjectOverviewNode | null }>(
    PROJECT_OVERVIEW_QUERY,
    { id },
  );

  const node = data.project;
  if (!node) return null;
  return mapProjectOverviewNode(node);
}

const PROJECT_CONTENT_UPDATE_MUTATION = `
  mutation BacksterProjectContentUpdate($id: String!, $input: ProjectUpdateInput!) {
    projectUpdate(id: $id, input: $input) {
      success
      project {
        id
        content
        documentContent {
          content
        }
        description
      }
    }
  }
`;

export async function updateLinearProjectContent(
  projectId: string,
  content: string,
): Promise<LinearProjectOverview | null> {
  const id = projectId.trim();
  if (!id) return null;

  const data = await linearGraphqlRequest<{
    projectUpdate?: {
      success?: boolean;
      project?: GraphqlProjectOverviewNode | null;
    } | null;
  }>(PROJECT_CONTENT_UPDATE_MUTATION, {
    id,
    input: { content },
  });

  if (!data.projectUpdate?.success || !data.projectUpdate.project) {
    throw new Error("Failed to update project description");
  }

  return mapProjectOverviewNode(data.projectUpdate.project);
}
