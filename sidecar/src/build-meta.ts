import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BUILD_SHA_MARKER = join(import.meta.dir, "..", ".app-build-sha");
const REPO_ROOT = join(import.meta.dir, "..", "..");

export function resolveAppBuildSha(): string {
  const fromEnv = process.env.APP_BUILD_SHA?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const fromKamal = process.env.KAMAL_VERSION?.trim();
  if (fromKamal) {
    return fromKamal;
  }

  if (existsSync(BUILD_SHA_MARKER)) {
    const fromMarker = readFileSync(BUILD_SHA_MARKER, "utf8").trim();
    if (fromMarker) {
      return fromMarker;
    }
  }

  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8", cwd: REPO_ROOT }).trim();
  } catch {
    return "unknown";
  }
}

export const APP_BUILD_SHA = resolveAppBuildSha();
