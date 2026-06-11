import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TOOLS_DIR = join(import.meta.dir, "../tools");
const SWIFT_SOURCE = join(TOOLS_DIR, "macos-pdf-ocr.swift");
const COMPILED_BINARY = join(TOOLS_DIR, "macos-pdf-ocr");

export function isMacOsVisionOcrAvailable(): boolean {
  return process.platform === "darwin" && (existsSync(COMPILED_BINARY) || existsSync(SWIFT_SOURCE));
}

function resolveOcrCommand(filePath: string): { command: string[]; cleanup?: () => Promise<void> } {
  if (existsSync(COMPILED_BINARY)) {
    return { command: [COMPILED_BINARY, filePath] };
  }

  if (existsSync(SWIFT_SOURCE)) {
    return { command: ["swift", SWIFT_SOURCE, filePath] };
  }

  throw new Error("macOS PDF OCR tool is not available");
}

async function writeTempPdf(buffer: Buffer): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(join(tmpdir(), "backsteros-pdf-ocr-"));
  const path = join(dir, "document.pdf");
  await writeFile(path, buffer);
  return {
    path,
    cleanup: async () => {
      await rm(dir, { recursive: true, force: true });
    },
  };
}

export async function extractPdfTextWithMacVision(
  buffer: Buffer,
  options: { filePath?: string } = {},
): Promise<string | null> {
  if (!isMacOsVisionOcrAvailable()) {
    return null;
  }

  let filePath = options.filePath;
  let cleanup: (() => Promise<void>) | undefined;

  if (!filePath) {
    const temp = await writeTempPdf(buffer);
    filePath = temp.path;
    cleanup = temp.cleanup;
  }

  try {
    const { command } = resolveOcrCommand(filePath);
    const proc = Bun.spawn(command, {
      stdout: "pipe",
      stderr: "pipe",
    });

    const [exitCode, stdout, stderr] = await Promise.all([
      proc.exited,
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    if (exitCode !== 0) {
      if (stderr.trim()) {
        console.warn(`macOS PDF OCR failed for ${filePath}: ${stderr.trim()}`);
      }
      return null;
    }

    const text = stdout.trim();
    return text.length > 0 ? text : null;
  } catch (error) {
    console.warn(`macOS PDF OCR unavailable: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  } finally {
    if (cleanup) {
      await cleanup();
    }
  }
}
