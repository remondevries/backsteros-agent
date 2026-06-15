import type { AppNotificationPayload } from "../lib/notificationPayloads";
import { isTauriRuntime } from "./runtime";

const EDGE_CACHE_KEY = "backsteros.tauri.notification-cache";
const EDGE_CACHE_LIMIT = 40;

export type CachedNotification = AppNotificationPayload & { cachedAt: number };

export function readNotificationEdgeCache(): CachedNotification[] {
  try {
    const raw = localStorage.getItem(EDGE_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CachedNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendNotificationEdgeCache(payload: AppNotificationPayload): void {
  const next: CachedNotification = { ...payload, cachedAt: Date.now() };
  const merged = [next, ...readNotificationEdgeCache()].slice(0, EDGE_CACHE_LIMIT);
  try {
    localStorage.setItem(EDGE_CACHE_KEY, JSON.stringify(merged));
  } catch {
    // Ignore quota errors.
  }
}

export async function showNativeNotification(title: string, body: string): Promise<void> {
  if (!isTauriRuntime() || typeof Notification === "undefined") {
    return;
  }

  try {
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if (Notification.permission !== "granted") {
      return;
    }
    new Notification(title, { body });
  } catch {
    // Ignore notification failures.
  }
}
