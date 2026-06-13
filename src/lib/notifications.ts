import { toast } from "sonner";
import type { AppNotificationPayload } from "./notificationPayloads";

const DEFAULT_DURATION_MS = 5000;
const DEDUPE_WINDOW_MS = 10_000;

const recentSignatures = new Map<string, number>();
const notificationListeners = new Set<(payload: AppNotificationPayload) => void>();

function pruneRecentSignatures(now: number): void {
  for (const [signature, timestamp] of recentSignatures) {
    if (now - timestamp > DEDUPE_WINDOW_MS) {
      recentSignatures.delete(signature);
    }
  }
}

export function buildNotificationSignature(payload: AppNotificationPayload): string {
  return [
    payload.kind ?? "info",
    payload.title,
    payload.message ?? "",
    payload.issueId ?? "",
    payload.projectId ?? "",
  ].join("|");
}

export function shouldDedupeNotification(
  payload: AppNotificationPayload,
  now = Date.now(),
): boolean {
  pruneRecentSignatures(now);
  const signature = buildNotificationSignature(payload);
  const previous = recentSignatures.get(signature);
  if (previous != null && now - previous < DEDUPE_WINDOW_MS) {
    return true;
  }
  recentSignatures.set(signature, now);
  return false;
}

export function subscribeToNotifications(
  listener: (payload: AppNotificationPayload) => void,
): () => void {
  notificationListeners.add(listener);
  return () => notificationListeners.delete(listener);
}

function emitNotification(payload: AppNotificationPayload): void {
  for (const listener of notificationListeners) {
    listener(payload);
  }
}

export function pushNotification(payload: AppNotificationPayload): string | null {
  if (shouldDedupeNotification(payload)) {
    return null;
  }

  emitNotification(payload);

  const toastId = toast(payload.title, {
    id: payload.id,
    description: payload.message,
    duration: payload.durationMs ?? DEFAULT_DURATION_MS,
    classNames: {
      toast: "app-notification-toast",
      title: "app-notification-toast__title",
      description: "app-notification-toast__description",
    },
    action: payload.action
      ? {
          label: payload.action.label,
          onClick: () => payload.action?.onClick?.(),
        }
      : undefined,
  });

  return String(toastId);
}

export function dismissNotification(id: string): void {
  toast.dismiss(id);
}
