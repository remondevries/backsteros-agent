export function stripJsonFence(text: string): string {
  let value = text.trim();
  value = value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return value;
}

export function parseJsonObject<T extends Record<string, unknown>>(text: string): T {
  const parsed = JSON.parse(stripJsonFence(text)) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Expected a JSON object from the model");
  }
  return parsed as T;
}
