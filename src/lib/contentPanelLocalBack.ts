export type ContentPanelLocalBackHandler = () => boolean;

const handlers: ContentPanelLocalBackHandler[] = [];

export function registerContentPanelLocalBack(handler: ContentPanelLocalBackHandler): () => void {
  handlers.push(handler);
  return () => {
    const index = handlers.indexOf(handler);
    if (index >= 0) {
      handlers.splice(index, 1);
    }
  };
}

export function tryContentPanelLocalBack(): boolean {
  for (let index = handlers.length - 1; index >= 0; index -= 1) {
    if (handlers[index]()) return true;
  }
  return false;
}

export function clearContentPanelLocalBackHandlers(): void {
  handlers.length = 0;
}
