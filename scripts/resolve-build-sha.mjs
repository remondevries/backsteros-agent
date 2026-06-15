import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const markerPath = join(rootDir, ".app-build-sha");

export function resolveBuildSha(options = {}) {
  const root = options.rootDir ?? rootDir;

  const fromEnv = process.env.APP_BUILD_SHA?.trim() || process.env.VITE_APP_BUILD_SHA?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const marker = options.markerPath ?? markerPath;
  if (existsSync(marker)) {
    const value = readFileSync(marker, "utf8").trim();
    if (value) {
      return value;
    }
  }

  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8", cwd: root }).trim();
  } catch {
    return "unknown";
  }
}
