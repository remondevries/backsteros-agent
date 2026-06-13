const FALLBACK_TERMINAL_LEAF_ID = 1;

function hashSessionKey(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

export function resolveTerminalLeafId(sessionKey?: string | null): number {
  const trimmed = sessionKey?.trim();
  if (!trimmed) return FALLBACK_TERMINAL_LEAF_ID;
  return hashSessionKey(`linear-issue-terminal:${trimmed}`) + 1024;
}

