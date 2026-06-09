import { MicVAD, type RealTimeVADOptions } from "@ricky0123/vad-web";

export type VadController = {
  start: () => Promise<void>;
  pause: () => void;
  destroy: () => void;
};

export type VadCallbacks = {
  onSpeechStart?: () => void;
  onSpeechEnd?: (audio: Float32Array) => void;
  onMisfire?: () => void;
};

const VAD_ASSET_BASE = "/vad/";

const DEFAULT_VAD_OPTIONS: Partial<RealTimeVADOptions> = {
  positiveSpeechThreshold: 0.8,
  negativeSpeechThreshold: 0.58,
  minSpeechFrames: 9,
  preSpeechPadFrames: 1,
  redemptionFrames: 4,
};

export async function createVadController(callbacks: VadCallbacks): Promise<VadController> {
  const vad = await MicVAD.new({
    ...DEFAULT_VAD_OPTIONS,
    baseAssetPath: VAD_ASSET_BASE,
    onnxWASMBasePath: VAD_ASSET_BASE,
    onSpeechStart: () => {
      callbacks.onSpeechStart?.();
    },
    onSpeechEnd: (audio) => {
      callbacks.onSpeechEnd?.(audio);
    },
    onVADMisfire: () => {
      callbacks.onMisfire?.();
    },
  });

  return {
    start: async () => {
      await vad.start();
    },
    pause: () => {
      vad.pause();
    },
    destroy: () => {
      vad.destroy();
    },
  };
}

export function isVadSupported(): boolean {
  return typeof AudioContext !== "undefined" && typeof navigator !== "undefined";
}
