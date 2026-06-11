import { describe, expect, test } from "bun:test";
import { AUTO_MODEL_ID, MAX_MODEL_ID_FALLBACK } from "./config.ts";
import {
  defaultAutoModelId,
  defaultMaxModelId,
  getAutoModelId,
  getMaxModelId,
  getSelectedModelId,
  resolveMaxModelId,
} from "./models.ts";
import type { AppSettings } from "./types.ts";

describe("models", () => {
  test("getAutoModelId prefers autoModelId setting", () => {
    const settings = {
      autoModelId: "composer-2-fast",
      modelMode: "auto",
    } as AppSettings;
    expect(getAutoModelId(settings)).toBe("composer-2-fast");
  });

  test("getMaxModelId prefers maxModelId setting", () => {
    const settings = {
      maxModelId: "claude-opus-4-6",
      modelMode: "max",
    } as AppSettings;
    expect(getMaxModelId(settings)).toBe("claude-opus-4-6");
  });

  test("getSelectedModelId uses mode-specific ids", () => {
    const settings = {
      autoModelId: "composer-2-fast",
      maxModelId: "claude-opus-4-6",
      modelMode: "max",
    } as AppSettings;
    expect(getSelectedModelId(settings)).toBe("claude-opus-4-6");

    settings.modelMode = "auto";
    expect(getSelectedModelId(settings)).toBe("composer-2-fast");
  });

  test("defaultAutoModelId prefers composer models", () => {
    expect(
      defaultAutoModelId([
        { id: "claude-opus-4-8", displayName: "Opus 4.8" },
        { id: AUTO_MODEL_ID, displayName: "Composer 2.5" },
      ]),
    ).toBe(AUTO_MODEL_ID);
  });

  test("defaultMaxModelId prefers latest opus", () => {
    const models = [
      { id: "claude-opus-4-6", displayName: "Opus 4.6" },
      { id: MAX_MODEL_ID_FALLBACK, displayName: "Opus 4.8" },
    ];
    expect(defaultMaxModelId(models)).toBe(MAX_MODEL_ID_FALLBACK);
    expect(resolveMaxModelId(models)).toBe(MAX_MODEL_ID_FALLBACK);
  });
});
