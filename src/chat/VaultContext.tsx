import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { buildObsidianUri, getVaultName } from "../lib/obsidianUri";
import { openExternalUrl } from "../lib/openExternalUrl";

export interface VaultContextValue {
  notesPath: string;
  vaultName: string;
  buildNoteUri: (filePath: string) => string;
  openNote: (filePath: string) => Promise<void>;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({
  notesPath,
  vaultNameOverride,
  children,
}: {
  notesPath: string;
  vaultNameOverride?: string | null;
  children: ReactNode;
}) {
  const vaultName = useMemo(
    () => getVaultName(notesPath, vaultNameOverride),
    [notesPath, vaultNameOverride],
  );

  const buildNoteUri = useCallback(
    (filePath: string) => buildObsidianUri(vaultName, filePath),
    [vaultName],
  );

  const openNote = useCallback(
    async (filePath: string) => {
      await openExternalUrl(buildObsidianUri(vaultName, filePath));
    },
    [vaultName],
  );

  const value = useMemo(
    () => ({
      notesPath,
      vaultName,
      buildNoteUri,
      openNote,
    }),
    [notesPath, vaultName, buildNoteUri, openNote],
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue | null {
  return useContext(VaultContext);
}

export function useVaultRequired(): VaultContextValue {
  const vault = useContext(VaultContext);
  if (!vault) {
    throw new Error("useVaultRequired must be used within VaultProvider");
  }
  return vault;
}
