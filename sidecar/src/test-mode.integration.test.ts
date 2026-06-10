import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const sidecarDir = join(import.meta.dir, "..");
const TEST_PORT = 13_847;
const TEST_TOKEN = "integration-test-token";

describe("test mode HTTP flows", () => {
  let proc: ReturnType<typeof Bun.spawn>;
  let baseUrl: string;
  let notesPath: string;
  let dataDir: string;

  beforeAll(async () => {
    dataDir = mkdtempSync(join(tmpdir(), "backster-test-mode-http-"));
    notesPath = join(dataDir, "vault");
    mkdirSync(join(notesPath, "Daily"), { recursive: true });
    writeFileSync(
      join(notesPath, "Daily/2026-06-10.md"),
      `---\ndate: "2026-06-10"\n---\n## Day log\nslept: 7h\n---\n`,
      "utf8",
    );
    writeFileSync(
      join(notesPath, "Daily/2026-06-09.md"),
      `---\ndate: "2026-06-09"\nsleep: 80\nrecovery: 75\nstrain: 6\nproductivity: 9\n---\n## Day log\n---\n`,
      "utf8",
    );

    const env = { ...process.env };
    env.BACKSTER_EXECUTION_MODE = "test";
    env.BACKSTER_DATA_DIR = dataDir;
    env.SIDECAR_PORT = String(TEST_PORT);
    env.SIDECAR_TOKEN = TEST_TOKEN;
    delete env.CURSOR_API_KEY;

    proc = Bun.spawn(["bun", "run", "src/server.ts"], {
      cwd: sidecarDir,
      env,
      stdout: "pipe",
      stderr: "pipe",
    });

    baseUrl = `http://127.0.0.1:${TEST_PORT}`;
    const readyLine = await readReadyLine(proc);
    const ready = JSON.parse(readyLine) as { type: string; port: number; token: string };
    expect(ready.type).toBe("ready");
    expect(ready.port).toBe(TEST_PORT);
    expect(ready.token).toBe(TEST_TOKEN);

    await waitForSidecar(baseUrl, TEST_TOKEN);

    const settingsRes = await fetch(`${baseUrl}/settings`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notesPath,
        executionMode: "test",
      }),
    });
    expect(settingsRes.ok).toBe(true);
  }, 30_000);

  afterAll(async () => {
    proc.kill();
    await proc.exited.catch(() => undefined);
    rmSync(dataDir, { recursive: true, force: true });
  });

  test("GET /settings reports test execution mode", async () => {
    const res = await fetch(`${baseUrl}/settings`, {
      headers: { Authorization: `Bearer ${TEST_TOKEN}` },
    });
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { executionMode: string; notesPath: string };
    expect(body.executionMode).toBe("test");
    expect(body.notesPath).toBe(notesPath);
  });

  test("POST /flows/good-morning/feel completes without CURSOR_API_KEY", async () => {
    const res = await fetch(`${baseUrl}/flows/good-morning/feel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ answer: "i feel rested and ready today" }),
    });

    expect(res.ok).toBe(true);
    const body = (await res.json()) as {
      polishedFeel: string;
      response: string;
      dailyNoteUpdate: { path: string; lines: string[] };
    };

    expect(body.polishedFeel).toBe("I feel rested and ready today.");
    expect(body.response).toBe("{{update:update|daily note}}");
    expect(body.dailyNoteUpdate.lines[0]).toBe("feel: I feel rested and ready today.");

    const note = readFileSync(join(notesPath, body.dailyNoteUpdate.path), "utf8");
    expect(note).toContain("feel: I feel rested and ready today.");
  });

  test("POST /flows/good-night/reflection completes without CURSOR_API_KEY", async () => {
    const res = await fetch(`${baseUrl}/flows/good-night/reflection`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        answers: [
          "shipped the feature",
          "skipped exercise",
          "a tough meeting",
          "block time earlier",
          "helped a teammate",
        ],
      }),
    });

    expect(res.ok).toBe(true);
    const body = (await res.json()) as {
      reflectionMarkdown: string;
      response: string;
      dailyNoteUpdate: { path: string };
    };

    expect(body.reflectionMarkdown).toContain("## Evening reflection");
    expect(body.reflectionMarkdown).toContain("- Shipped the feature.");
    expect(body.response).toContain("Thanks for your answers");

    const note = readFileSync(join(notesPath, body.dailyNoteUpdate.path), "utf8");
    expect(note).toContain("## Evening reflection");
  });

  test("env override wins over persisted settings", async () => {
    const putRes = await fetch(`${baseUrl}/settings`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ executionMode: "live" }),
    });

    expect(putRes.ok).toBe(true);
    const putBody = (await putRes.json()) as { executionMode: string };
    expect(putBody.executionMode).toBe("test");

    const settingsFile = JSON.parse(
      readFileSync(join(dataDir, "settings.json"), "utf8"),
    ) as { executionMode: string };
    expect(settingsFile.executionMode).toBe("live");
  });
});

async function readReadyLine(proc: ReturnType<typeof Bun.spawn>): Promise<string> {
  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(`Sidecar exited before ready. stderr: ${stderr}`);
    }

    buffer += decoder.decode(value, { stream: true });
    const newlineIndex = buffer.indexOf("\n");
    if (newlineIndex >= 0) {
      return buffer.slice(0, newlineIndex);
    }
  }
}

async function waitForSidecar(baseUrl: string, token: string, attempts = 40): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const res = await fetch(`${baseUrl}/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return;
      }
    } catch {
      // Sidecar prints ready before the HTTP listener is up.
    }

    await Bun.sleep(50);
  }

  throw new Error(`Sidecar did not become reachable at ${baseUrl}`);
}
