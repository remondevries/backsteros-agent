import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { MODEL_ID, WhisperEngine } from "./whisper.ts";

const MIN_PCM_SAMPLES = 160; // ~10ms at 16 kHz
const SAMPLE_RATE = 16_000;

function getSttRoot(): string {
  if (process.env.STT_ROOT) {
    return process.env.STT_ROOT;
  }

  const sidecarRoot = join(import.meta.dir, "..");
  const devRoot = join(sidecarRoot, "stt");
  if (existsSync(devRoot)) {
    return devRoot;
  }

  // Bundled layout: stt lives alongside the sidecar resources.
  return join(sidecarRoot, "..", "stt");
}

function whisperCacheDir(): string {
  return join(getSttRoot(), "whisper");
}

const engine = new WhisperEngine(whisperCacheDir());

export function isSttReady(): boolean {
  return engine.isReady();
}

export function isSttAvailable(): boolean {
  return true;
}

export function getSttModelId(): string {
  return MODEL_ID;
}

export async function warmupStt(): Promise<void> {
  await engine.warmup();
}

export async function transcribeAudio(pcm: Float32Array): Promise<string> {
  if (pcm.length < MIN_PCM_SAMPLES) {
    return "";
  }

  return engine.transcribe(pcm);
}

export { SAMPLE_RATE as STT_SAMPLE_RATE };

void warmupStt().catch(() => {
  // Warmup is best-effort; first transcribe will retry initialization.
});
