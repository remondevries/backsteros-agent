let hideTimeout: number | null = null;

export async function setTrafficLightsVisible(visible: boolean): Promise<void> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("set_traffic_lights_visible", { visible });
  } catch {
    // Browser dev mode has no Tauri invoke bridge.
  }
}

export function showTrafficLights(): void {
  if (hideTimeout !== null) {
    window.clearTimeout(hideTimeout);
    hideTimeout = null;
  }
  void setTrafficLightsVisible(true);
}

export function scheduleHideTrafficLights(): void {
  if (hideTimeout !== null) {
    window.clearTimeout(hideTimeout);
  }
  hideTimeout = window.setTimeout(() => {
    hideTimeout = null;
    void setTrafficLightsVisible(false);
  }, 350);
}
