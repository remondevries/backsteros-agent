#!/usr/bin/env bun
/**
 * Pre-downloads the Kokoro-82M ONNX model into sidecar/tts/kokoro so it ships
 * with the bundled app instead of downloading on first launch.
 */
import { warmupSpeech } from "./src/tts.ts";

console.log("Downloading Kokoro-82M (q4) TTS model — this may take a minute...");
await warmupSpeech();
console.log("Kokoro TTS model ready.");
