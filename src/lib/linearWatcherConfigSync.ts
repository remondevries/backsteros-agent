type WatcherConfigSyncListener = (
  projectId: string,
  config: { enabled: boolean; pollIntervalMs: number; autoDispatchAgents: boolean },
) => void;

const listeners = new Set<WatcherConfigSyncListener>();

export function subscribeWatcherConfigSync(listener: WatcherConfigSyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publishWatcherConfigSync(
  projectId: string,
  config: { enabled: boolean; pollIntervalMs: number; autoDispatchAgents: boolean },
): void {
  for (const listener of listeners) {
    listener(projectId, config);
  }
}
