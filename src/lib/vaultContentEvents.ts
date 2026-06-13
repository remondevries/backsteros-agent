type VaultContentChangedListener = () => void;

const listeners = new Set<VaultContentChangedListener>();

export function onVaultContentChanged(listener: VaultContentChangedListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyVaultContentChanged(): void {
  for (const listener of listeners) {
    listener();
  }
}
