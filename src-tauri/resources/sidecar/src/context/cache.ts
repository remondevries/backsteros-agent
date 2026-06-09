import { existsSync, readFileSync, statSync } from "node:fs";

interface FileCacheEntry {
  mtimeMs: number;
  content: string;
}

interface CompiledCacheEntry<T> {
  mtimeMs: number;
  value: T;
}

const fileContentCache = new Map<string, FileCacheEntry>();
const compiledContextCache = new Map<string, CompiledCacheEntry<string | null>>();

export function readCachedFileContent(path: string): string | null {
  try {
    if (!existsSync(path)) {
      return null;
    }

    const { mtimeMs } = statSync(path);
    const cached = fileContentCache.get(path);
    if (cached && cached.mtimeMs === mtimeMs) {
      return cached.content;
    }

    const content = readFileSync(path, "utf8");
    fileContentCache.set(path, { mtimeMs, content });
    return content;
  } catch (error) {
    console.warn(`[context] Failed to read ${path}:`, error);
    return null;
  }
}

export function loadCachedCompiledContext(
  path: string,
  compile: (content: string) => string | null,
): string | null {
  try {
    if (!existsSync(path)) {
      compiledContextCache.delete(path);
      return null;
    }

    const { mtimeMs } = statSync(path);
    const cached = compiledContextCache.get(path);
    if (cached && cached.mtimeMs === mtimeMs) {
      return cached.value;
    }

    const content = readCachedFileContent(path);
    if (content === null) {
      return null;
    }

    const value = compile(content);
    compiledContextCache.set(path, { mtimeMs, value });
    return value;
  } catch (error) {
    console.warn(`[context] Failed to compile context from ${path}:`, error);
    return null;
  }
}

export function invalidateContextCache(path?: string): void {
  if (path) {
    fileContentCache.delete(path);
    compiledContextCache.delete(path);
    return;
  }

  fileContentCache.clear();
  compiledContextCache.clear();
}
