import { linearGraphqlRequest } from "./graphql.ts";

const ISSUE_CHILDREN_QUERY = `
  query BacksterIssueChildren($id: String!) {
    issue(id: $id) {
      children(first: 250) {
        nodes {
          id
        }
      }
    }
  }
`;

const ISSUE_DELETE_MUTATION = `
  mutation BacksterIssueDelete($id: String!) {
    issueDelete(id: $id) {
      success
    }
  }
`;

async function fetchLinearIssueChildIds(issueId: string): Promise<string[]> {
  const data = await linearGraphqlRequest<{
    issue?: {
      children?: {
        nodes?: Array<{ id?: string | null } | null> | null;
      } | null;
    } | null;
  }>(ISSUE_CHILDREN_QUERY, { id: issueId });

  return (data.issue?.children?.nodes ?? [])
    .map((node) => node?.id?.trim())
    .filter((id): id is string => Boolean(id));
}

async function deleteLinearIssueMutation(issueId: string): Promise<void> {
  const data = await linearGraphqlRequest<{
    issueDelete?: { success?: boolean } | null;
  }>(ISSUE_DELETE_MUTATION, { id: issueId });

  if (!data.issueDelete?.success) {
    throw new Error("Failed to delete issue");
  }
}

export async function deleteLinearIssue(issueId: string): Promise<void> {
  const id = issueId.trim();
  if (!id) {
    throw new Error("Issue id is required");
  }

  const childIds = await fetchLinearIssueChildIds(id);
  for (const childId of childIds) {
    await deleteLinearIssue(childId);
  }

  await deleteLinearIssueMutation(id);
}
