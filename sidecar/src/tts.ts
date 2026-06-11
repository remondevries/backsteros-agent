import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_VOICE_ID,
  KokoroEngine,
  KOKORO_VOICES,
  isValidVoice,
  type KokoroVoice,
} from "./kokoro.ts";

export type TtsVoice = KokoroVoice;

export { DEFAULT_VOICE_ID };

const SYNTHESIS_CACHE_LIMIT = 32;

function getTtsRoot(): string {
  if (process.env.TTS_ROOT) {
    return process.env.TTS_ROOT;
  }

  const sidecarRoot = join(import.meta.dir, "..");
  const devRoot = join(sidecarRoot, "tts");
  if (existsSync(devRoot)) {
    return devRoot;
  }

  // Bundled layout: tts lives alongside the sidecar resources.
  return join(sidecarRoot, "..", "tts");
}

function kokoroCacheDir(): string {
  return join(getTtsRoot(), "kokoro");
}

export function listTtsVoices(): TtsVoice[] {
  return KOKORO_VOICES;
}

function synthesisCacheKey(text: string, voiceId: string): string {
  return createHash("sha256").update(`${voiceId}\0${text}`).digest("hex");
}

const engine = new KokoroEngine(kokoroCacheDir());
const synthesisCache = new Map<string, Buffer>();
const synthesisInFlight = new Map<string, Promise<Buffer>>();

function rememberSynthesis(key: string, audio: Buffer): void {
  if (synthesisCache.has(key)) {
    synthesisCache.delete(key);
  }
  synthesisCache.set(key, audio);
  while (synthesisCache.size > SYNTHESIS_CACHE_LIMIT) {
    const oldest = synthesisCache.keys().next().value;
    if (!oldest) break;
    synthesisCache.delete(oldest);
  }
}

export function stopSpeech(): void {
  // Playback is stopped on the client. Keep the warm Kokoro engine alive.
}

export function isTtsReady(): boolean {
  return engine.isReady();
}

export async function warmupSpeech(voiceId: string = DEFAULT_VOICE_ID): Promise<void> {
  await engine.warmup(voiceId);
}

export async function synthesizeSpeech(text: string, voiceId: string): Promise<Buffer> {
  const resolvedVoice = isValidVoice(voiceId) ? voiceId : DEFAULT_VOICE_ID;
  const key = synthesisCacheKey(text, resolvedVoice);
  const cached = synthesisCache.get(key);
  if (cached) {
    return cached;
  }

  const pending = synthesisInFlight.get(key);
  if (pending) {
    return pending;
  }

  const task = engine.synthesize(text, resolvedVoice).then((audio) => {
    rememberSynthesis(key, audio);
    synthesisInFlight.delete(key);
    return audio;
  });

  synthesisInFlight.set(key, task);
  return task;
}

export function isTtsAvailable(): boolean {
  // Kokoro ships with the sidecar and lazily downloads/loads its model, so TTS
  // is always available as a capability.
  return true;
}
