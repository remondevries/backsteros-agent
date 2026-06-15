/**
 * Web-build stub — real implementation comes from @tauri-apps/api/core in Tauri builds.
 */

export class Channel<T> {
  onmessage: ((data: T) => void) | null = null;
}

export async function invoke<T>(
  _cmd: string,
  _args?: unknown,
  _options?: unknown,
): Promise<T> {
  throw new Error("Desktop shell APIs are not available in the web app.");
}
