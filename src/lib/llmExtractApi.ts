import { getSidecarConnection } from "./api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const connection = getSidecarConnection();
  const response = await fetch(`${connection.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${connection.token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  if (!response.ok) {
    let message = text || `Request failed: ${response.status}`;
    try {
      const body = JSON.parse(text) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Keep raw text.
    }
    throw new Error(message);
  }

  return JSON.parse(text) as T;
}

export async function listLlmExtractTasks() {
  return request<{ tasks: Array<{ id: string; description: string }> }>("/llm-extract/tasks");
}

export async function runLlmExtract<TData>(taskId: string, message: string, context?: Record<string, unknown>) {
  return request<{ taskId: string; data: TData }>("/llm-extract", {
    method: "POST",
    body: JSON.stringify({ taskId, message, context }),
  });
}
