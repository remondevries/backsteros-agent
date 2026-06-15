import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

const API_PREFIXES = [
  "/flows",
  "/settings",
  "/sessions",
  "/lookup",
  "/runs",
  "/approvals",
  "/hooks",
  "/workspace",
  "/tts",
  "/stt",
  "/llm-extract",
  "/linear",
  "/integrations",
  "/profiles",
  "/vault",
  "/healthz",
  "/auth",
];

export function looksLikeApiPath(pathname: string): boolean {
  return API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function resolveDistDir(): string | null {
  const candidates = [
    process.env.BACKSTER_STATIC_DIR?.trim(),
    join(import.meta.dir, "..", "..", "dist"),
    join(import.meta.dir, "..", "dist"),
  ].filter((entry): entry is string => Boolean(entry));

  for (const candidate of candidates) {
    const resolved = resolve(candidate);
    if (existsSync(join(resolved, "index.html"))) {
      return resolved;
    }
  }

  return null;
}

function contentTypeFor(filePath: string): string {
  return MIME_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

export function tryServeStatic(request: Request, distDir: string): Response | null {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return null;
  }

  const url = new URL(request.url);
  if (looksLikeApiPath(url.pathname)) {
    return null;
  }

  const distRoot = resolve(distDir);
  const relativePath =
    url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
  const filePath = resolve(distRoot, relativePath);

  if (!filePath.startsWith(distRoot)) {
    return null;
  }

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    const body = request.method === "HEAD" ? null : readFileSync(filePath);
    return new Response(body, {
      headers: {
        "Content-Type": contentTypeFor(filePath),
        "Cache-Control": relativePath.startsWith("assets/") ? "public, max-age=31536000, immutable" : "no-cache",
      },
    });
  }

  const indexPath = join(distRoot, "index.html");
  if (!existsSync(indexPath)) {
    return null;
  }

  const indexBody = request.method === "HEAD" ? null : readFileSync(indexPath);
  return new Response(indexBody, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
