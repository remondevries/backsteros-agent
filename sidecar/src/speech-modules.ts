type TtsModule = typeof import("./tts.ts");
type SttModule = typeof import("./stt.ts");

let ttsModulePromise: Promise<TtsModule> | null = null;
let sttModulePromise: Promise<SttModule> | null = null;

export function loadTtsModule(): Promise<TtsModule> {
  ttsModulePromise ??= import("./tts.ts");
  return ttsModulePromise;
}

export function loadSttModule(): Promise<SttModule> {
  sttModulePromise ??= import("./stt.ts");
  return sttModulePromise;
}
