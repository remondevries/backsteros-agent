import { Cursor, type ModelListItem, type ModelSelection } from "@cursor/sdk";
import {
  AUTO_MODEL_ID,
  MAX_MODEL_ID_FALLBACK,
  getCursorApiKey,
} from "./config.ts";
import type { AppSettings } from "./types.ts";

export type ModelMode = "auto" | "max";

const FALLBACK_MODELS: ModelListItem[] = [
  {
    id: AUTO_MODEL_ID,
    displayName: "Composer 2.5",
  },
  {
    id: MAX_MODEL_ID_FALLBACK,
    displayName: "Opus 4.8",
  },
];

let cachedMaxModelId = MAX_MODEL_ID_FALLBACK;

export async function listAvailableModels(): Promise<ModelListItem[]> {
  const apiKey = getCursorApiKey();
  if (!apiKey) {
    return FALLBACK_MODELS;
  }

  try {
    const models = await Promise.race([
      Cursor.models.list({ apiKey }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Cursor model list timed out")), 5_000);
      }),
    ]);
    return Array.isArray(models) && models.length > 0 ? models : FALLBACK_MODELS;
  } catch {
    return FALLBACK_MODELS;
  }
}

function scoreOpusModel(id: string): number {
  let score = 0;
  if (id.includes("4-8") || id.includes("4.8")) score += 100;
  else if (id.includes("4-6") || id.includes("4.6")) score += 80;
  if (id.includes("thinking-high")) score += 20;
  else if (id.includes("thinking")) score += 10;
  return score;
}

export function resolveMaxModelId(models: ModelListItem[]): string {
  const opusModels = models.filter(
    (model) =>
      model.id.toLowerCase().includes("opus") ||
      model.displayName.toLowerCase().includes("opus") ||
      model.aliases?.some((alias) => alias.toLowerCase().includes("opus")),
  );

  if (opusModels.length === 0) {
    return MAX_MODEL_ID_FALLBACK;
  }

  return opusModels.sort(
    (left, right) =>
      scoreOpusModel(right.id) - scoreOpusModel(left.id) ||
      right.id.localeCompare(left.id),
  )[0]!.id;
}

export async function refreshMaxModelCache(): Promise<string> {
  const models = await listAvailableModels();
  cachedMaxModelId = resolveMaxModelId(models);
  return cachedMaxModelId;
}

export function getCachedMaxModelId(): string {
  return cachedMaxModelId;
}

export function getModelMode(settings: AppSettings): ModelMode {
  if (settings.modelMode === "auto" || settings.modelMode === "max") {
    return settings.modelMode;
  }

  const legacyId = settings.modelId?.trim();
  if (legacyId) {
    if (
      legacyId.toLowerCase().includes("opus") ||
      legacyId === cachedMaxModelId ||
      legacyId === MAX_MODEL_ID_FALLBACK
    ) {
      return "max";
    }
  }

  return "auto";
}

export function getSelectedModelId(settings: AppSettings): string {
  if (getModelMode(settings) === "max") {
    return cachedMaxModelId;
  }

  const fromEnv = process.env.MODEL_ID?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  return AUTO_MODEL_ID;
}

export function getSelectedModelSelection(settings: AppSettings): ModelSelection {
  const id = getSelectedModelId(settings);
  if (getModelMode(settings) === "auto") {
    return { id, params: [{ id: "fast", value: "true" }] };
  }
  return { id };
}

export function getModelModeLabel(mode: ModelMode): string {
  return mode === "max" ? "Max" : "Auto";
}

export function getModelDisplayName(
  models: ModelListItem[],
  modelId: string,
): string {
  const exact = models.find(
    (model) =>
      model.id === modelId ||
      model.aliases?.includes(modelId),
  );
  if (exact?.displayName) {
    return exact.displayName;
  }

  const normalized = modelId.replace(/-thinking-high$|-thinking$/, "");
  const fuzzy = models.find(
    (model) =>
      model.id === normalized ||
      model.aliases?.includes(normalized) ||
      model.id.startsWith(`${normalized}-`) ||
      normalized.startsWith(model.id),
  );
  if (fuzzy?.displayName) {
    return fuzzy.displayName;
  }

  if (/opus/i.test(modelId)) {
    const version = modelId.match(/opus-(\d+(?:-\d+)?)/i)?.[1];
    return version ? `Opus ${version.replace("-", ".")}` : "Opus";
  }

  if (/composer/i.test(modelId)) {
    const version = normalized.match(/composer-([0-9]+(?:[-.][0-9]+)*)/i)?.[1];
    if (version) {
      // Cursor model IDs sometimes encode versions as `composer-2-5` instead of `composer-2.5`.
      return `Composer ${version.replace(/-/g, ".")}`;
    }
    return "Composer 2.5";
  }

  return modelId;
}

export async function resolveSelectedModelName(settings: AppSettings): Promise<string> {
  const models = await listAvailableModels();
  const mode = getModelMode(settings);

  if (mode === "max") {
    const modelId = resolveMaxModelId(models);
    cachedMaxModelId = modelId;
    return getModelDisplayName(models, modelId);
  }

  return getModelDisplayName(models, getSelectedModelId(settings));
}
