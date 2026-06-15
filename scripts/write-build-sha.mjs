import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveBuildSha } from "./resolve-build-sha.mjs";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const markerPath = join(rootDir, ".app-build-sha");
const sha = resolveBuildSha({ rootDir, markerPath });

writeFileSync(markerPath, `${sha}\n`, "utf8");
console.log(`App build SHA: ${sha.slice(0, 7)}`);
