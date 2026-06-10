export const RESPONSE_LOADER_MIN_MS = 1000;
export const RESPONSE_CURSOR_MS = 500;

export type ResponsePresentationPhase = "loading" | "cursor" | "typing";

export function isResponseContentReady(text: string, running: boolean): boolean {
  return text.length > 0 || !running;
}

export function canLeaveLoadingPhase(
  elapsedMs: number,
  text: string,
  running: boolean,
): boolean {
  return elapsedMs >= RESPONSE_LOADER_MIN_MS && isResponseContentReady(text, running);
}
