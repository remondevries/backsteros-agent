import { linearGraphqlRequest } from "./graphql.ts";

const ATTACHMENT_CREATE_MUTATION = `
  mutation BacksterAttachmentCreate($input: AttachmentCreateInput!) {
    attachmentCreate(input: $input) {
      success
    }
  }
`;

/** Attach a URL to an issue (e.g. a Linear document link or uploaded file URL). */
export async function createLinearIssueAttachment(input: {
  issueId: string;
  title: string;
  url: string;
  subtitle?: string;
}): Promise<void> {
  const issueId = input.issueId.trim();
  const title = input.title.trim();
  const url = input.url.trim();
  if (!issueId || !title || !url) {
    throw new Error("issueId, title, and url are required for attachmentCreate");
  }

  const response = await linearGraphqlRequest<{
    attachmentCreate?: { success?: boolean } | null;
  }>(ATTACHMENT_CREATE_MUTATION, {
    input: {
      issueId,
      title,
      url,
      ...(input.subtitle?.trim() ? { subtitle: input.subtitle.trim() } : {}),
    },
  });

  if (!response.attachmentCreate?.success) {
    throw new Error("Linear rejected issue attachment creation");
  }
}
