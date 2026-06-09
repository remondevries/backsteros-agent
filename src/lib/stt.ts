import { getSidecarConnection } from "./api";

export type SttStatus = {
  available: boolean;
  ready: boolean;
  modelId: string;
};

async function sttRequest(
  path: string,
  init?: RequestInit,
  timeoutMs = 30_000,
): Promise<Response> {
  const { baseUrl, token } = getSidecarConnection();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const externalSignal = init?.signal;

  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeout);
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  try {
    return await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function getSttStatus(): Promise<SttStatus | null> {
  try {
    const response = await sttRequest("/stt/status", { method: "GET" }, 5_000);
    if (!response.ok) return null;
    return (await response.json()) as SttStatus;
  } catch {
    return null;
  }
}

export async function isSttSupported(): Promise<boolean> {
  try {
    const response = await sttRequest("/stt/status", { method: "GET" }, 5_000);
    if (!response.ok) return false;
    const body = (await response.json()) as SttStatus;
    return body.available;
  } catch {
    return false;
  }
}

export async function primeStt(): Promise<void> {
  const response = await sttRequest(
    "/stt/warmup",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    },
    120_000,
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "STT warmup failed");
  }
}

export async function transcribePcm(pcm: Float32Array, signal?: AbortSignal): Promise<string> {
  const response = await sttRequest(
    "/stt/transcribe",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength) as ArrayBuffer,
      signal,
    },
    120_000,
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Speech transcription failed");
  }

  const body = (await response.json()) as { text?: string };
  return body.text?.trim() ?? "";
}
