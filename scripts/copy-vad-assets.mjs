import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const vadPackageDir = join(rootDir, "node_modules", "@ricky0123", "vad-web", "dist");
const ortPackageDir = join(rootDir, "node_modules", "onnxruntime-web", "dist");
const targetDir = join(rootDir, "public", "vad");

if (!existsSync(vadPackageDir)) {
  console.warn("Skipping VAD asset copy — @ricky0123/vad-web is not installed yet.");
  process.exit(0);
}

mkdirSync(targetDir, { recursive: true });

const vadAssetNames = [
  "silero_vad_legacy.onnx",
  "silero_vad_v5.onnx",
  "vad.worklet.bundle.min.js",
];

for (const name of vadAssetNames) {
  const source = join(vadPackageDir, name);
  if (existsSync(source)) {
    cpSync(source, join(targetDir, name));
  } else {
    console.warn(`Missing VAD asset: ${name}`);
  }
}

if (existsSync(ortPackageDir)) {
  for (const entry of readdirSync(ortPackageDir)) {
    if (entry.endsWith(".wasm") || entry.endsWith(".mjs")) {
      cpSync(join(ortPackageDir, entry), join(targetDir, entry));
    }
  }
} else {
  console.warn("Missing onnxruntime-web dist — VAD WASM files were not copied.");
}

console.log(`Copied VAD assets to ${targetDir}`);
