import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const totemDir = join(import.meta.dirname, "..", "node_modules", "@briangaoo", "totem");
const cognitoDist = join(totemDir, "dist", "whoop", "cognito.js");

if (existsSync(cognitoDist)) {
  process.exit(0);
}

if (!existsSync(join(totemDir, "package.json"))) {
  console.warn("[build-totem] @briangaoo/totem is not installed — skipping compile");
  process.exit(0);
}

console.log("[build-totem] Compiling @briangaoo/totem (GitHub source has no prebuilt dist)…");

const install = spawnSync("bun", ["install"], { cwd: totemDir, stdio: "inherit" });
if (install.status !== 0) {
  process.exit(install.status ?? 1);
}

const compile = spawnSync("bunx", ["tsc"], { cwd: totemDir, stdio: "inherit" });
if (compile.status !== 0) {
  process.exit(compile.status ?? 1);
}

if (!existsSync(cognitoDist)) {
  console.error("[build-totem] compile finished but dist/whoop/cognito.js is missing");
  process.exit(1);
}

console.log("[build-totem] done");
