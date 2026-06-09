#!/usr/bin/env bun
/**
 * Pre-downloads the Whisper-base.en ONNX model into sidecar/stt/whisper so it
 * ships with the bundled app instead of downloading on first launch.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

mkdirSync(join(import.meta.dir, "stt", "whisper"), { recursive: true });

import { warmupStt } from "./src/stt.ts";

console.log("Downloading Whisper-tiny.en (q8) STT model — this may take a minute...");
await warmupStt();
console.log("Whisper STT model ready.");
