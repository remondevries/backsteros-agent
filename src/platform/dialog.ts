import { isTauriRuntime } from "./runtime";

export async function pickDirectory(defaultPath?: string): Promise<string | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      directory: true,
      multiple: false,
      defaultPath: defaultPath ?? undefined,
    });
    return typeof selected === "string" ? selected : null;
  } catch {
    return null;
  }
}
