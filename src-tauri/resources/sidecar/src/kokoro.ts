import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { KokoroTTS } from "kokoro-js";
import { env } from "@huggingface/transformers";

/**
 * Kokoro-82M (ONNX) text-to-speech engine.
 *
 * We use the q4 quantization: on Apple Silicon it synthesizes a sentence in
 * ~0.5-1s (faster than the audio plays back, so the streaming speech queue
 * never starves) while sounding far more natural than Piper. The model is
 * cached under the TTS root so it ships with the bundled app instead of being
 * re-downloaded on every launch.
 */

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const DTYPE = "q4" as const;
/** 1.0 = default Kokoro pace; 1.3 ≈ 30% faster. */
const SPEECH_SPEED = 1.3;

export const DEFAULT_VOICE_ID = "bf_emma";

export interface KokoroVoice {
  id: string;
  name: string;
  language: string;
  quality: string;
  gender: string;
}

// Kokoro ships its voices inside the model, so there is nothing to download
// per-voice. We expose a curated subset; the default is a natural UK female.
export const KOKORO_VOICES: KokoroVoice[] = [
  { id: "bf_emma", name: "Emma (UK, female)", language: "en-GB", quality: "high", gender: "female" },
  { id: "bf_isabella", name: "Isabella (UK, female)", language: "en-GB", quality: "high", gender: "female" },
  { id: "bm_george", name: "George (UK, male)", language: "en-GB", quality: "high", gender: "male" },
  { id: "af_heart", name: "Heart (US, female)", language: "en-US", quality: "high", gender: "female" },
  { id: "am_michael", name: "Michael (US, male)", language: "en-US", quality: "high", gender: "male" },
];

const VOICE_IDS = new Set(KOKORO_VOICES.map((voice) => voice.id));

export function isValidVoice(voiceId: string): boolean {
  return VOICE_IDS.has(voiceId);
}

let cacheDirConfigured = false;

function configureCacheDir(cacheDir: string): void {
  if (cacheDirConfigured) return;
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
  // Persist the model next to the other TTS assets so build.ts bundles it.
  env.cacheDir = cacheDir;
  cacheDirConfigured = true;
}

interface KokoroInstance {
  generate(
    text: string,
    options: { voice: string; speed?: number },
  ): Promise<{ toWav(): ArrayBuffer }>;
}

export class KokoroEngine {
  private instance: KokoroInstance | null = null;
  private loadPromise: Promise<KokoroInstance> | null = null;
  private chain: Promise<unknown> = Promise.resolve();

  constructor(private readonly cacheDir: string) {}

  isReady(): boolean {
    return this.instance !== null;
  }

  async warmup(voiceId: string = DEFAULT_VOICE_ID): Promise<void> {
    const instance = await this.load();
    if (!this.warmedUp) {
      this.warmedUp = true;
      // Prime the inference graph so the first real request is fast.
      await instance.generate("Ready.", { voice: this.resolveVoice(voiceId), speed: SPEECH_SPEED });
    }
  }

  private warmedUp = false;

  synthesize(text: string, voiceId: string): Promise<Buffer> {
    const task = this.chain.then(() => this.synthesizeOnce(text, voiceId));
    this.chain = task.catch(() => {});
    return task;
  }

  private resolveVoice(voiceId: string): string {
    return isValidVoice(voiceId) ? voiceId : DEFAULT_VOICE_ID;
  }

  private async load(): Promise<KokoroInstance> {
    if (this.instance) return this.instance;
    if (!this.loadPromise) {
      configureCacheDir(this.cacheDir);
      this.loadPromise = KokoroTTS.from_pretrained(MODEL_ID, {
        dtype: DTYPE,
        device: "cpu",
      }).then((instance) => {
        this.instance = instance as unknown as KokoroInstance;
        return this.instance;
      });
    }
    return this.loadPromise;
  }

  private async synthesizeOnce(text: string, voiceId: string): Promise<Buffer> {
    const instance = await this.load();
    const audio = await instance.generate(text, {
      voice: this.resolveVoice(voiceId),
      speed: SPEECH_SPEED,
    });
    return Buffer.from(audio.toWav());
  }
}
