import { linearGraphqlRequest } from "./graphql.ts";
import { getLinearAuthToken } from "./auth-token.ts";

export type LinearViewerSummary = {
  id: string;
  name: string;
  email: string | null;
};

export async function fetchLinearViewer(): Promise<LinearViewerSummary> {
  const token = getLinearAuthToken();
  if (!token) {
    throw new Error("Linear is not connected");
  }

  const data = await linearGraphqlRequest<{
    viewer?: {
      id?: string | null;
      name?: string | null;
      email?: string | null;
    } | null;
  }>(`query BacksterLinearViewer { viewer { id name email } }`);

  const id = data.viewer?.id?.trim();
  if (!id) {
    throw new Error("Linear viewer id is missing");
  }

  const name = data.viewer?.name?.trim() || data.viewer?.email?.trim() || "Linear user";
  const email = data.viewer?.email?.trim() || null;

  return { id, name, email };
}
