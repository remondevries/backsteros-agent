import { getLinearApiKey } from "../config.ts";

export const LINEAR_GRAPHQL_URL = "https://api.linear.app/graphql";

export async function linearGraphqlRequest<T>(
  query: string,
  variables: Record<string, unknown>,
  options?: { apiKey?: string },
): Promise<T> {
  const apiKey = options?.apiKey?.trim() || getLinearApiKey();
  if (!apiKey) {
    throw new Error("LINEAR_API_KEY is not configured");
  }

  const response = await fetch(LINEAR_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const body = (await response.json()) as {
    data?: T;
    errors?: Array<{ message?: string }>;
  };

  if (!response.ok || body.errors?.length) {
    const detail = body.errors
      ?.map((error) => error.message ?? "Unknown error")
      .join("; ");
    const hint =
      detail?.includes("project not in same team as issue")
        ? " The grocery project belongs to a different Linear team than the one used to create the issue. Restart the sidecar after updating — it should resolve the project team automatically."
        : "";
    throw new Error(`${detail ?? `Linear API request failed (${response.status})`}${hint}`);
  }

  if (!body.data) {
    throw new Error("Linear API returned no data");
  }

  return body.data;
}
