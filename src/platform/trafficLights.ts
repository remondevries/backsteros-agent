import { isTauriRuntime } from "./runtime";

export async function setTrafficLightsVisible(visible: boolean): Promise<void> {
  if (!isTauriRuntime()) return;

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("set_traffic_lights_visible", { visible });
  } catch {
    // Ignore when unavailable.
  }
}

export async function showTrafficLights(): Promise<void> {
  await setTrafficLightsVisible(true);
}
