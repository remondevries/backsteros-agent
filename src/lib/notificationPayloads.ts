export type AppNotificationKind = "info" | "success" | "warning" | "error";

export type AppNotificationAction = {
  label: string;
  onClick?: () => void;
};

export type AppNotificationPayload = {
  id?: string;
  kind?: AppNotificationKind;
  title: string;
  message?: string;
  durationMs?: number;
  issueId?: string;
  projectId?: string;
  url?: string;
  action?: AppNotificationAction;
};

export type LinearWatcherChangeKind =
  | "issue_created"
  | "status_changed"
  | "assignee_changed"
  | "priority_changed"
  | "title_changed"
  | "updated";

export type LinearWatcherChangeEvent = {
  type: "linear.watcher.change";
  projectId: string;
  projectName: string;
  issueId: string;
  identifier: string;
  title: string;
  url: string;
  changeKind: LinearWatcherChangeKind;
  summary: string;
  previousStatus?: string;
  currentStatus?: string;
  detectedAt: string;
};

export type LinearWatcherHeartbeatEvent = {
  type: "linear.watcher.heartbeat";
  timestamp: string;
};

export type LinearWatcherPollEvent = {
  type: "linear.watcher.poll";
  projectId: string;
  pollIntervalMs: number;
  polledAt: string;
  nextPollAt: string;
};

export type LinearWatcherStreamEvent =
  | LinearWatcherChangeEvent
  | LinearWatcherHeartbeatEvent
  | LinearWatcherPollEvent;

export function isLinearWatcherChangeEvent(
  event: LinearWatcherStreamEvent,
): event is LinearWatcherChangeEvent {
  return event.type === "linear.watcher.change";
}

export function linearWatcherChangeToNotification(
  event: LinearWatcherChangeEvent,
): AppNotificationPayload {
  return {
    id: `linear-watcher:${event.projectId}:${event.issueId}:${event.changeKind}:${event.detectedAt}`,
    kind: "info",
    title: `${event.identifier} updated`,
    message: event.summary,
    issueId: event.issueId,
    projectId: event.projectId,
    url: event.url,
    durationMs: 6000,
  };
}
