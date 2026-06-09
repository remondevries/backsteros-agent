import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

/**
 * Whisper-base.en (ONNX) speech-to-text engine.
 *
 * Uses q8 quantization for a good speed/quality balance on Apple Silicon.
 * The model is cached under the STT root so it ships with the bundled app.
 */

/** Tiny English model — ~2-3x faster than base.en with slightly lower accuracy. */
export const MODEL_ID = "Xenova/whisper-tiny.en";
const DTYPE = "q8" as const;
const SAMPLE_RATE = 16_000;
const WARMUP_SAMPLES = SAMPLE_RATE / 2; // 0.5s silence is enough to warm kernels

let cacheDirConfigured = false;

function configureCacheDir(cacheDir: string): void {
  if (cacheDirConfigured) return;
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
  env.cacheDir = cacheDir;
  cacheDirConfigured = true;
}

export class WhisperEngine {
  private instance: AutomaticSpeechRecognitionPipeline | null = null;
  private loadPromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;
  private chain: Promise<unknown> = Promise.resolve();

  constructor(private readonly cacheDir: string) {}

  isReady(): boolean {
    return this.instance !== null;
  }

  async warmup(): Promise<void> {
    const instance = await this.load();
    if (!this.warmedUp) {
      this.warmedUp = true;
      const silence = new Float32Array(WARMUP_SAMPLES);
      await instance(silence, { sampling_rate: SAMPLE_RATE });
    }
  }

  private warmedUp = false;

  transcribe(audio: Float32Array): Promise<string> {
    const task = this.chain.then(() => this.transcribeOnce(audio));
    this.chain = task.catch(() => {});
    return task;
  }

  private async load(): Promise<AutomaticSpeechRecognitionPipeline> {
    if (this.instance) return this.instance;
    if (!this.loadPromise) {
      configureCacheDir(this.cacheDir);
      this.loadPromise = pipeline("automatic-speech-recognition", MODEL_ID, {
        dtype: DTYPE,
        device: "cpu",
      }).then((instance) => {
        this.instance = instance;
        return instance;
      });
    }
    return this.loadPromise;
  }

  private async transcribeOnce(audio: Float32Array): Promise<string> {
    if (audio.length === 0) {
      return "";
    }

    const instance = await this.load();
    const durationSec = audio.length / SAMPLE_RATE;
    const chunkLengthSec = Math.min(30, Math.max(5, Math.ceil(durationSec) + 1));
    const result = await instance(audio, {
      sampling_rate: SAMPLE_RATE,
      chunk_length_s: chunkLengthSec,
      stride_length_s: Math.min(3, Math.max(1, Math.floor(chunkLengthSec / 3))),
      return_timestamps: false,
    });
    const output = Array.isArray(result) ? result[0] : result;
    const text = typeof output?.text === "string" ? output.text.trim() : "";
    return text;
  }
}
