import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const sidecarDir = join(rootDir, "sidecar");
const distDir = join(rootDir, "dist");
const port = Number(process.env.SMOKE_PORT ?? "3857");
const token = process.env.SMOKE_TOKEN ?? "smoke-test-token";
const baseUrl = `http://127.0.0.1:${port}`;

function spawnServer() {
  return spawn("bun", ["run", "src/server.ts"], {
    cwd: sidecarDir,
    env: {
      ...process.env,
      SIDECAR_PORT: String(port),
      SIDECAR_TOKEN: token,
      SIDECAR_HOST: "127.0.0.1",
      NODE_ENV: "development",
      BACKSTER_STATIC_DIR: distDir,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForHealth(child, attempts = 40) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Sidecar exited before becoming healthy (code ${child.exitCode})`);
    }
    try {
      const response = await fetch(`${baseUrl}/healthz`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until timeout.
    }
    await sleep(250);
  }
  throw new Error(`Sidecar did not become healthy at ${baseUrl}/healthz`);
}

async function main() {
  const child = spawnServer();
  let stderr = "";

  child.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });

  try {
    await waitForHealth(child);

    const health = await fetch(`${baseUrl}/healthz`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!health.ok) {
      throw new Error(`healthz failed: ${health.status}`);
    }

    const index = await fetch(`${baseUrl}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!index.ok) {
      throw new Error(`index failed: ${index.status}`);
    }
    const html = await index.text();
    if (!html.includes("<!doctype html") && !html.includes("<!DOCTYPE html")) {
      throw new Error("index.html response did not look like HTML");
    }

    console.log("smoke-web: ok");
  } finally {
    child.kill("SIGTERM");
    await sleep(200);
    if (child.exitCode === null) {
      child.kill("SIGKILL");
    }
    if (child.exitCode !== null && child.exitCode !== 0 && child.signalCode !== "SIGTERM") {
      console.error(stderr.trim());
      process.exit(child.exitCode ?? 1);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
