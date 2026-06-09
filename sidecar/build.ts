#!/usr/bin/env bun
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const sidecarDir = import.meta.dir;
const targetDir = join(sidecarDir, "../src-tauri/resources/sidecar");
const ttsTargetDir = join(sidecarDir, "../src-tauri/resources/tts");
const sttTargetDir = join(sidecarDir, "../src-tauri/resources/stt");
const kokoroCacheDir = join(sidecarDir, "tts/kokoro");
const whisperCacheDir = join(sidecarDir, "stt/whisper");

if (!existsSync(kokoroCacheDir)) {
  console.log("TTS model missing — downloading Kokoro-82M ONNX model...");
  Bun.spawnSync(["bun", "run", join(sidecarDir, "download-tts.ts")], {
    cwd: sidecarDir,
    stdout: "inherit",
    stderr: "inherit",
  });
}

if (!existsSync(whisperCacheDir)) {
  console.log("STT model missing — downloading Whisper-base.en ONNX model...");
  Bun.spawnSync(["bun", "run", join(sidecarDir, "download-stt.ts")], {
    cwd: sidecarDir,
    stdout: "inherit",
    stderr: "inherit",
  });
}

rmSync(targetDir, { recursive: true, force: true });
mkdirSync(targetDir, { recursive: true });

for (const file of ["package.json", "bun.lock", "tsconfig.json"]) {
  cpSync(join(sidecarDir, file), join(targetDir, file));
}

cpSync(join(sidecarDir, "src"), join(targetDir, "src"), { recursive: true });
cpSync(join(sidecarDir, "node_modules"), join(targetDir, "node_modules"), {
  recursive: true,
});

rmSync(ttsTargetDir, { recursive: true, force: true });
cpSync(join(sidecarDir, "tts"), ttsTargetDir, { recursive: true });

rmSync(sttTargetDir, { recursive: true, force: true });
cpSync(join(sidecarDir, "stt"), sttTargetDir, { recursive: true });

console.log(`Bundled sidecar resources to ${targetDir}`);
console.log(`Bundled TTS resources to ${ttsTargetDir}`);
console.log(`Bundled STT resources to ${sttTargetDir}`);
