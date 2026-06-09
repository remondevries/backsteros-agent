import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { SDKCustomTool } from "@cursor/sdk";
import {
  formatTodayDailyNoteResult,
  getTodayDailyNote,
} from "./daily-note.ts";
import { isDestructiveShellCommand } from "./shell-policy.ts";
import { formatWikilinkResolution, resolveWikilink } from "./wikilink.ts";

function resolveWorkspacePath(notesPath: string, targetPath: string): string {
  const abs = join(notesPath, targetPath);
  const rel = relative(notesPath, abs);
  if (rel.startsWith("..") || rel === "..") {
    throw new Error("Path must stay inside the notes workspace");
  }
  return abs;
}

function assertWritable(notesPath: string, targetPath: string): string {
  const abs = resolveWorkspacePath(notesPath, targetPath);
  const rel = relative(notesPath, abs).replace(/\\/g, "/");
  if (rel === "archive" || rel.startsWith("archive/")) {
    throw new Error("archive/ is read-only");
  }
  return abs;
}

function countFiles(absPath: string): number {
  let count = 0;
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const next = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(next);
      } else if (entry.isFile()) {
        count += 1;
      }
    }
  };
  walk(absPath);
  return count;
}

const SHELL_TIMEOUT_MS = 30_000;
const SHELL_MAX_OUTPUT_CHARS = 32_000;

export interface WorkspaceCustomToolOptions {
  requestShellApproval?: (command: string, cwd?: string) => Promise<boolean>;
}

function formatShellResult(
  command: string,
  cwd: string,
  exitCode: number | null,
  stdout: string,
  stderr: string,
  timedOut: boolean,
): string {
  const parts = [
    `command: ${command}`,
    `cwd: ${cwd}`,
    `exit: ${exitCode ?? "unknown"}`,
  ];

  if (timedOut) {
    parts.push(`timed out after ${SHELL_TIMEOUT_MS}ms`);
  }

  const combined = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
  if (combined) {
    const clipped =
      combined.length > SHELL_MAX_OUTPUT_CHARS
        ? `${combined.slice(0, SHELL_MAX_OUTPUT_CHARS)}\n…[output truncated]`
        : combined;
    parts.push(clipped);
  }

  return parts.join("\n");
}

export function getWorkspaceCustomTools(
  notesPath: string,
  options: WorkspaceCustomToolOptions = {},
): Record<string, SDKCustomTool> {
  return {
    count_workspace_files: {
      description:
        "Count files under a folder relative to the notes workspace root. Prefer this over shell find/wc for workspace folders like Daily.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Folder path relative to workspace root, e.g. Daily",
          },
        },
        required: ["path"],
      },
      execute: (args) => {
        const target = String(args.path ?? ".");
        const abs = resolveWorkspacePath(notesPath, target);
        if (!statSync(abs).isDirectory()) {
          throw new Error(`Not a directory: ${target}`);
        }
        return String(countFiles(abs));
      },
    },
    list_workspace_entries: {
      description:
        "List file and folder names in a workspace directory relative to the notes root.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Folder path relative to workspace root, e.g. Daily",
          },
          limit: {
            type: "number",
            description: "Maximum entries to return (default 100)",
          },
        },
        required: ["path"],
      },
      execute: (args) => {
        const target = String(args.path ?? ".");
        const limit = Number(args.limit ?? 100);
        const abs = resolveWorkspacePath(notesPath, target);
        const entries = readdirSync(abs, { withFileTypes: true }).map((entry) =>
          entry.isDirectory() ? `${entry.name}/` : entry.name,
        );
        return entries.slice(0, Math.max(1, limit)).join("\n");
      },
    },
    read_workspace_file: {
      description: "Read a text/markdown file relative to the notes workspace root.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path relative to workspace root",
          },
        },
        required: ["path"],
      },
      execute: (args) => {
        const target = String(args.path ?? "");
        const abs = resolveWorkspacePath(notesPath, target);
        if (!statSync(abs).isFile()) {
          throw new Error(`Not a file: ${target}`);
        }
        return readFileSync(abs, "utf8");
      },
    },
    write_workspace_file: {
      description:
        "Create or overwrite a text/markdown file relative to the notes workspace root. Use this instead of built-in write/edit tools.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path relative to workspace root, e.g. Daily/2026-06-07.md",
          },
          content: {
            type: "string",
            description: "Full file contents to write",
          },
        },
        required: ["path", "content"],
      },
      execute: (args) => {
        const target = String(args.path ?? "");
        const content = String(args.content ?? "");
        const abs = assertWritable(notesPath, target);
        mkdirSync(dirname(abs), { recursive: true });
        writeFileSync(abs, content, "utf8");
        return `Wrote ${target} (${content.length} bytes)`;
      },
    },
    run_workspace_shell: {
      description:
        "Run a shell command inside the notes workspace. Use this instead of the built-in shell tool for git, find, grep, wc, and other workspace commands. Commands run with the workspace root (or an optional relative cwd) as the working directory.",
      inputSchema: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "Shell command to run, e.g. git status --short",
          },
          cwd: {
            type: "string",
            description: "Optional working directory relative to workspace root, e.g. Daily",
          },
        },
        required: ["command"],
      },
      execute: async (args) => {
        const command = String(args.command ?? "").trim();
        if (!command) {
          throw new Error("command is required");
        }

        const cwdArg = String(args.cwd ?? ".").trim() || ".";
        const absCwd = resolveWorkspacePath(notesPath, cwdArg);
        if (!statSync(absCwd).isDirectory()) {
          throw new Error(`Not a directory: ${cwdArg}`);
        }

        if (isDestructiveShellCommand(command)) {
          const approved = await options.requestShellApproval?.(command, cwdArg);
          if (!approved) {
            throw new Error("Shell command denied by user");
          }
        }

        const result = spawnSync(command, {
          cwd: absCwd,
          shell: true,
          encoding: "utf8",
          timeout: SHELL_TIMEOUT_MS,
          maxBuffer: SHELL_MAX_OUTPUT_CHARS * 2,
          env: {
            ...process.env,
            PWD: absCwd,
          },
        });

        return formatShellResult(
          command,
          cwdArg,
          result.status,
          result.stdout ?? "",
          result.stderr ?? "",
          result.error?.message?.includes("ETIMEDOUT") ?? false,
        );
      },
    },
    append_workspace_file: {
      description:
        "Append text to the end of a workspace file. Creates the file if missing. Use for adding lines to daily notes.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path relative to workspace root, e.g. Daily/2026-06-07.md",
          },
          text: {
            type: "string",
            description: "Text to append (a newline is added automatically if the file does not end with one)",
          },
        },
        required: ["path", "text"],
      },
      execute: (args) => {
        const target = String(args.path ?? "");
        const text = String(args.text ?? "");
        const abs = assertWritable(notesPath, target);
        mkdirSync(dirname(abs), { recursive: true });

        let existing = "";
        if (statSync(abs, { throwIfNoEntry: false })?.isFile()) {
          existing = readFileSync(abs, "utf8");
        }

        const needsNewline = existing.length > 0 && !existing.endsWith("\n");
        const next = `${existing}${needsNewline ? "\n" : ""}${text}`;
        writeFileSync(abs, next, "utf8");
        return `Appended to ${target}`;
      },
    },
    today_daily_note: {
      description:
        "Resolve today's daily note path using the user's timezone from profile.md. Optionally read or create Daily/YYYY-MM-DD.md. Prefer this over guessing today's date or path.",
      inputSchema: {
        type: "object",
        properties: {
          include_content: {
            type: "boolean",
            description: "Include file contents when the note exists (default true)",
          },
          create_if_missing: {
            type: "boolean",
            description: "Create the daily note with frontmatter and day log structure when missing (default false)",
          },
        },
      },
      execute: (args) => {
        const includeContent = args.include_content !== false;
        const createIfMissing = args.create_if_missing === true;
        const result = getTodayDailyNote(notesPath, {
          includeContent,
          createIfMissing,
        });
        return formatTodayDailyNoteResult(result);
      },
    },
    resolve_wikilink: {
      description:
        "Resolve an Obsidian [[wikilink]] target to a workspace file path. Use before read_workspace_file when following links inside note content.",
      inputSchema: {
        type: "object",
        properties: {
          link: {
            type: "string",
            description: "Wikilink target, e.g. Daily/2026-06-07 or Project Alpha#Goals",
          },
          from: {
            type: "string",
            description: "Optional source file path for same-folder relative resolution",
          },
        },
        required: ["link"],
      },
      execute: (args) => {
        const link = String(args.link ?? "").trim();
        if (!link) {
          throw new Error("link is required");
        }
        const from = String(args.from ?? "").trim() || undefined;
        return formatWikilinkResolution(resolveWikilink(notesPath, link, from));
      },
    },
  };
}
