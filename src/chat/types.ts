export type ToolCategory = "linear" | "calendar" | "whoop" | "notes" | "generic";

export interface LinearIssueEntity {
  id: string;
  identifier?: string;
  title: string;
  status?: string;
  stateType?: string;
  statusColor?: string;
  url?: string;
  priority?: number;
  assigneeName?: string;
  assigneeAvatarUrl?: string;
  assigneeId?: string;
  projectName?: string;
  dueDate?: string;
}

export interface MarkdownFileEntity {
  path: string;
  title?: string;
}

export interface CalendarEventEntity {
  id: string;
  title: string;
  start?: string;
  end?: string;
  calendarName?: string;
  calendarColor?: string;
  location?: string;
  url?: string;
  created?: boolean;
}

export interface WhoopSleepStagesSummary {
  remMs?: number | null;
  remPct?: number | null;
  lightMs?: number | null;
  lightPct?: number | null;
  swsMs?: number | null;
  swsPct?: number | null;
  wakeMs?: number | null;
  wakePct?: number | null;
}

export type WhoopSleepStage = "AWAKE" | "LIGHT" | "REM" | "SWS";

export interface WhoopSleepHypnogramSegment {
  startedAt: string;
  endedAt: string;
  stage: WhoopSleepStage;
}

export interface WhoopStrainTarget {
  value?: number | null;
  optimalLower?: number | null;
  optimalUpper?: number | null;
}

export interface WhoopHrZoneDurations {
  zone0Ms?: number | null;
  zone1Ms?: number | null;
  zone2Ms?: number | null;
  zone3Ms?: number | null;
  zone4Ms?: number | null;
  zone5Ms?: number | null;
}

export interface WhoopWorkoutEntity {
  id: string;
  sportName: string;
  sportId?: number;
  start: string;
  end: string;
  duration?: string;
  strain?: number | null;
  avgHrBpm?: number | null;
  maxHrBpm?: number | null;
  calories?: number | null;
  distanceM?: number | null;
}

export interface WhoopSnapshotEntity {
  id: string;
  date: string;
  recoveryScore?: number | null;
  recoveryState?: "GREEN" | "YELLOW" | "RED" | null;
  hrvMs?: number | null;
  rhrBpm?: number | null;
  sleepPerformance?: number | null;
  sleepDuration?: string;
  strainScore?: number | null;
  workoutsCount?: number;
  strainTarget?: WhoopStrainTarget;
  strainCalories?: number | null;
  strainAvgHrBpm?: number | null;
  strainMaxHrBpm?: number | null;
  strainZoneDurations?: WhoopHrZoneDurations;
  steps?: number | null;
  strengthActivityTime?: string;
  workouts?: WhoopWorkoutEntity[];
  sleepStartedAt?: string | null;
  sleepEndedAt?: string | null;
  timeInBed?: string;
  sleepEfficiencyPct?: number | null;
  sleepConsistencyPct?: number | null;
  sleepStages?: WhoopSleepStagesSummary;
  sleepHypnogram?: WhoopSleepHypnogramSegment[];
  disturbances?: number | null;
  sleepHrAvgBpm?: number | null;
  sleepHrMinBpm?: number | null;
}

export interface MorningReviewWeatherEntity {
  locationLabel: string;
  description: string;
  temperatureC: number | null;
}

export interface MorningReviewMetaEntity {
  id: string;
  greetingName?: string;
  weather?: MorningReviewWeatherEntity;
}

export interface GoodNightMetaEntity {
  id: string;
  greetingName?: string;
  productivityScore?: number | null;
  completedIssueCount?: number;
  tomorrowDate?: string;
}

export type StructuredPayload =
  | { type: "linear_issues"; items: LinearIssueEntity[] }
  | { type: "linear_issues_moved"; items: LinearIssueEntity[] }
  | { type: "linear_issues_completed"; items: LinearIssueEntity[] }
  | { type: "markdown_files"; items: MarkdownFileEntity[] }
  | { type: "calendar_events"; items: CalendarEventEntity[] }
  | { type: "whoop_snapshots"; items: WhoopSnapshotEntity[] }
  | { type: "morning_review_meta"; meta: MorningReviewMetaEntity }
  | { type: "good_night_meta"; meta: GoodNightMetaEntity }
  | { type: "file_diff"; path: string; summary?: string };

export type AgentEvent =
  | { type: "message.delta"; runId: string; text: string }
  | { type: "run.started"; runId: string; timestamp: number }
  | {
      type: "run.completed";
      runId: string;
      status: "finished" | "error" | "cancelled";
      durationMs: number;
    }
  | { type: "run.failed"; runId: string; message: string }
  | { type: "startup.failed"; message: string; retryable?: boolean }
  | { type: "activity.started"; runId: string; timestamp: number }
  | {
      type: "activity.step";
      runId: string;
      stepId: string;
      kind: ToolCategory;
      label: string;
      status: "running" | "completed" | "error";
      toolName?: string;
      durationMs?: number;
    }
  | { type: "activity.completed"; runId: string; durationMs: number }
  | {
      type: "tool.started";
      runId: string;
      toolCallId: string;
      toolName: string;
      category: ToolCategory;
      label: string;
    }
  | {
      type: "tool.updated";
      runId: string;
      toolCallId: string;
      args?: unknown;
      label?: string;
    }
  | {
      type: "tool.completed";
      runId: string;
      toolCallId: string;
      toolName: string;
      category: ToolCategory;
      result?: unknown;
      structured?: StructuredPayload;
    }
  | {
      type: "context.added";
      runId: string;
      entityType: "linear_issue" | "markdown_file";
      id: string;
      title: string;
    }
  | {
      type: "entities.created";
      runId: string;
      entityType:
        | "linear_issue"
        | "linear_issue_moved"
        | "linear_issue_completed"
        | "markdown_file"
        | "calendar_event"
        | "whoop_snapshot"
        | "morning_review_meta"
        | "good_night_meta";
      items:
        | LinearIssueEntity[]
        | MarkdownFileEntity[]
        | CalendarEventEntity[]
        | WhoopSnapshotEntity[]
        | MorningReviewMetaEntity[]
        | GoodNightMetaEntity[];
    }
  | {
      type: "entities.updated";
      runId: string;
      entityType:
        | "linear_issue"
        | "linear_issue_moved"
        | "linear_issue_completed"
        | "markdown_file"
        | "calendar_event"
        | "whoop_snapshot"
        | "morning_review_meta"
        | "good_night_meta";
      items:
        | LinearIssueEntity[]
        | MarkdownFileEntity[]
        | CalendarEventEntity[]
        | WhoopSnapshotEntity[]
        | MorningReviewMetaEntity[]
        | GoodNightMetaEntity[];
    }
  | {
      type: "approval.requested";
      approvalId: string;
      runId: string;
      summary: string;
      action: string;
      path?: string;
    }
  | { type: "approval.resolved"; approvalId: string; approved: boolean }
  | { type: "suggestions.added"; runId: string; items: string[] };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt?: number;
  runId?: string;
  quickActionId?: string;
  flowVariant?: "good-morning" | "good-night" | "letter" | "daily-capture" | "grocery-list" | "delete-file";
  /** Links a flow follow-up assistant message to the run that triggered it. */
  flowRunId?: string;
  presentation?: "backster";
  attachments?: MessageAttachment[];
  contextChips?: Array<{ id: string; title: string; entityType: string }>;
}

export interface RunViewModel {
  runId: string;
  durationMs?: number;
  startedAt?: number;
  finishedAt?: number;
  status?: "running" | "finished" | "error" | "cancelled";
  steps: Array<{
    stepId: string;
    kind: ToolCategory;
    label: string;
    status: "running" | "completed" | "error";
    durationMs?: number;
  }>;
  text: string;
  entities: StructuredPayload[];
  approvals: Array<{
    approvalId: string;
    summary: string;
    action: string;
    path?: string;
    resolved?: boolean;
    approved?: boolean;
  }>;
  expanded: boolean;
}

export type RunFixtureId =
  | "linear-search-running"
  | "linear-search-done"
  | "linear-read-issue"
  | "linear-create"
  | "linear-multi"
  | "obsidian-search-running"
  | "obsidian-search-done"
  | "obsidian-read"
  | "obsidian-write"
  | "obsidian-list"
  | "obsidian-approval"
  | "calendar-search-running"
  | "calendar-search-done"
  | "calendar-freebusy"
  | "calendar-create"
  | "calendar-multi"
  | "whoop-fetch-running"
  | "whoop-today-done"
  | "whoop-daily-note"
  | "whoop-recovery-states";

export type ModelMode = "auto" | "max";

export type ExecutionMode = "live" | "test";

export type LinearIssueLinkMode = "external" | "internal";

export interface AppSettings {
  notesPath: string | null;
  vaultName?: string | null;
  agentId: string | null;
  defaultNotesPath: string;
  modelMode: ModelMode;
  modelId: string;
  autoModelId?: string | null;
  maxModelId?: string | null;
  modelName?: string;
  defaultModelMode: ModelMode;
  executionMode?: ExecutionMode;
  defaultExecutionMode?: ExecutionMode;
  issueLinkMode?: LinearIssueLinkMode;
  groceryLinearProjectId?: string | null;
  userProfilePath?: string;
  agentProfilePath?: string;
}

export interface SidecarConnection {
  baseUrl: string;
  token: string;
}

export interface AttachmentWireInput {
  name: string;
  mimeType: string;
  data: string;
}

export interface MessageAttachment {
  kind: "image" | "text" | "binary";
  name: string;
  mimeType: string;
  vaultPath?: string;
  previewUrl?: string;
  storageId?: string;
}

export interface AttachmentPreviewTarget {
  name: string;
  mimeType: string;
  kind: "image" | "text" | "binary";
  previewUrl?: string;
  vaultPath?: string;
  file?: File;
}

export interface PendingAttachment {
  id: string;
  file: File;
  name: string;
  mimeType: string;
  size: number;
  previewUrl?: string;
}
