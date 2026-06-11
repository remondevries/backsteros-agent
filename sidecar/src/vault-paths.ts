export function normalizeVaultRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}

export function isArchiveVaultPath(vaultRelativePath: string): boolean {
  const normalized = normalizeVaultRelativePath(vaultRelativePath);
  return normalized === "archive" || normalized.startsWith("archive/");
}

export function isObsidianConfigVaultPath(vaultRelativePath: string): boolean {
  const normalized = normalizeVaultRelativePath(vaultRelativePath);
  return normalized === ".obsidian" || normalized.startsWith(".obsidian/");
}

export function isExcludedVaultPath(vaultRelativePath: string): boolean {
  return isArchiveVaultPath(vaultRelativePath) || isObsidianConfigVaultPath(vaultRelativePath);
}

export function shouldSkipVaultDirectory(directoryName: string): boolean {
  return directoryName === ".obsidian" || directoryName === "archive";
}

export function assertWritableVaultPath(vaultRelativePath: string): void {
  if (isArchiveVaultPath(vaultRelativePath)) {
    throw new Error("archive/ is read-only");
  }
  if (isObsidianConfigVaultPath(vaultRelativePath)) {
    throw new Error(".obsidian/ is Obsidian system config — not part of your notes");
  }
}
