import { loadCachedCompiledContext } from "./cache.ts";

const BOILERPLATE_PREFIXES = [
  "BacksterOS Agent reads",
  "Edit the fields",
] as const;

export function isBoilerplateLine(line: string): boolean {
  return BOILERPLATE_PREFIXES.some((prefix) => line.startsWith(prefix));
}

export function filterMarkdownContextLines(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line, index) => {
      if (line.length === 0) return false;
      if (index === 0 && line.startsWith("#")) return false;
      if (isBoilerplateLine(line)) return false;
      return true;
    });
}

export interface MarkdownContextOptions {
  header: string;
  footerLines?: string[];
}

export function compileMarkdownContext(
  content: string,
  { header, footerLines = [] }: MarkdownContextOptions,
): string | null {
  const lines = filterMarkdownContextLines(content);
  if (lines.length === 0) {
    return null;
  }

  return [header, ...lines, ...footerLines].join("\n");
}

export function loadMarkdownContextFile(
  path: string,
  options: MarkdownContextOptions,
): string | null {
  return loadCachedCompiledContext(path, (content) =>
    compileMarkdownContext(content, options),
  );
}
