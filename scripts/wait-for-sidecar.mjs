const SIDECAR_URL = "http://127.0.0.1:3847/healthz";
const MAX_ATTEMPTS = 80;
const DELAY_MS = 125;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
  try {
    const response = await fetch(SIDECAR_URL);
    if (response.ok) {
      process.exit(0);
    }
  } catch {
    // Sidecar still starting.
  }

  await sleep(DELAY_MS);
}

console.error("Timed out waiting for sidecar on port 3847");
process.exit(1);
