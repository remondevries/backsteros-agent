const SIDECAR_URL = "http://127.0.0.1:3847/healthz";
const MAX_ATTEMPTS = 120;
const DELAY_MS = 125;
const REQUIRED_STREAK = 3;
const STREAK_DELAY_MS = 75;
const SETTLE_MS = 150;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let sawDown = false;
let streak = 0;

for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
  try {
    const response = await fetch(SIDECAR_URL);
    if (response.ok) {
      if (!sawDown) {
        // A previous sidecar may still be shutting down after kill:sidecar.
        await sleep(DELAY_MS);
        continue;
      }

      streak += 1;
      if (streak >= REQUIRED_STREAK) {
        await sleep(SETTLE_MS);
        process.exit(0);
      }

      await sleep(STREAK_DELAY_MS);
      continue;
    }
  } catch {
    sawDown = true;
  }

  streak = 0;
  await sleep(DELAY_MS);
}

console.error("Timed out waiting for sidecar on port 3847");
process.exit(1);
