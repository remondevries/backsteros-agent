import {
  resolveLinearStatusColor,
  type LinearStatusColorScheme,
} from "./linearStatusColor";

export type LinearWorkflowStateForIcon = {
  id: string;
  name: string;
  type: string;
  color?: string;
  position?: number;
};

export type LinearStatusIconKey =
  | "triage"
  | "backlog"
  | "unstarted"
  | "started"
  | "in_review"
  | "on_hold"
  | "completed"
  | "unknown";

export type LinearStatusIconModel =
  | { kind: "triage"; color: string }
  | { kind: "backlog"; color: string }
  | { kind: "completed"; color: string }
  | { kind: "ring"; color: string; fillRatio: number };

const RING_STATE_TYPES = new Set(["unstarted", "started", "canceled"]);
const FILL_RANGE_STATE_TYPES = new Set(["unstarted", "started", "completed"]);

function isRingWorkflowStateType(type?: string): boolean {
  return RING_STATE_TYPES.has(normalizeStateType(type));
}

function isFillRangeWorkflowStateType(type?: string): boolean {
  return FILL_RANGE_STATE_TYPES.has(normalizeStateType(type));
}

function readWorkflowStatePosition(state: LinearWorkflowStateForIcon): number | null {
  return Number.isFinite(state.position) ? Number(state.position) : null;
}

/** Position-based fill across configured workflow state types. */
export function computeWorkflowPositionFillRatio(
  workflowStates: LinearWorkflowStateForIcon[],
  currentState: LinearWorkflowStateForIcon,
  fillRangeTypes: Set<string>,
): number {
  const currentType = normalizeStateType(currentState.type);
  if (!fillRangeTypes.has(currentType) || currentType === "completed") {
    return 0;
  }

  const rangeStates = sortLinearWorkflowStates(workflowStates).filter((state) =>
    fillRangeTypes.has(normalizeStateType(state.type)),
  );
  const rangePositions = rangeStates
    .map(readWorkflowStatePosition)
    .filter((position): position is number => position != null);
  if (rangePositions.length < 2) return 0;

  const minPosition = Math.min(...rangePositions);
  const maxPosition = Math.max(...rangePositions);
  if (maxPosition <= minPosition) return 0;

  const currentPosition = readWorkflowStatePosition(currentState);
  if (currentPosition == null) return 0;

  return (currentPosition - minPosition) / (maxPosition - minPosition);
}

/** Position-based fill across unstarted → started → completed workflow states. */
export function computeLinearStatusFillRatio(
  workflowStates: LinearWorkflowStateForIcon[],
  currentState: LinearWorkflowStateForIcon,
): number {
  const currentType = normalizeStateType(currentState.type);
  if (!isFillRangeWorkflowStateType(currentType) || currentType === "completed") {
    return 0;
  }

  return computeWorkflowPositionFillRatio(workflowStates, currentState, FILL_RANGE_STATE_TYPES);
}

export function resolveLinearStatusKey(
  status?: string,
  stateType?: string,
): LinearStatusIconKey {
  const name = status?.trim().toLowerCase() ?? "";
  const type = stateType?.trim().toLowerCase() ?? "";

  if (name.includes("in review")) return "in_review";
  if (name.includes("on hold")) return "on_hold";

  if (type === "triage" || name === "triage") return "triage";
  if (type === "backlog" || name.includes("backlog")) return "backlog";
  if (type === "completed" || name === "done" || name === "completed") return "completed";
  if (type === "unstarted" || name === "todo" || name === "unstarted") return "unstarted";
  if (type === "started" || name.includes("progress")) return "started";

  if (type === "canceled" || name === "canceled" || name === "cancelled") return "unstarted";

  if (name.includes("ready to start")) return "unstarted";
  if (name.includes("review")) return "in_review";
  if (name.includes("hold")) return "on_hold";

  return "unknown";
}

export function sortLinearWorkflowStates<T extends LinearWorkflowStateForIcon>(
  states: T[],
): T[] {
  return [...states].sort((left, right) => {
    const leftPosition = Number.isFinite(left.position) ? Number(left.position) : Number.NaN;
    const rightPosition = Number.isFinite(right.position) ? Number(right.position) : Number.NaN;
    if (Number.isFinite(leftPosition) && Number.isFinite(rightPosition) && leftPosition !== rightPosition) {
      return leftPosition - rightPosition;
    }
    if (Number.isFinite(leftPosition) && !Number.isFinite(rightPosition)) return -1;
    if (!Number.isFinite(leftPosition) && Number.isFinite(rightPosition)) return 1;
    return left.name.localeCompare(right.name);
  });
}

function normalizeStateType(value?: string): string {
  return value?.trim().toLowerCase() ?? "";
}

function resolveCurrentWorkflowState(
  workflowStates: LinearWorkflowStateForIcon[],
  stateId?: string | null,
  status?: string,
): LinearWorkflowStateForIcon | null {
  const trimmedStateId = stateId?.trim();
  if (trimmedStateId) {
    const byId = workflowStates.find((state) => state.id === trimmedStateId);
    if (byId) return byId;
  }

  const normalizedStatus = status?.trim().toLowerCase() ?? "";
  if (!normalizedStatus) return null;

  return (
    workflowStates.find((state) => state.name.trim().toLowerCase() === normalizedStatus) ?? null
  );
}

function resolveColor(
  stateType: string,
  statusColor?: string,
  colorScheme?: LinearStatusColorScheme,
): string {
  return resolveLinearStatusColor(stateType, statusColor, { colorScheme });
}

function computeFillRatioFromWorkflowStates(
  workflowStates: LinearWorkflowStateForIcon[],
  currentState: LinearWorkflowStateForIcon | null,
): number {
  if (!currentState || !isRingWorkflowStateType(currentState.type)) {
    return 0;
  }

  return computeLinearStatusFillRatio(workflowStates, currentState);
}

export function computeLinearStatusIconModel(input: {
  stateId?: string | null;
  stateType?: string;
  status?: string;
  statusColor?: string;
  workflowStates?: LinearWorkflowStateForIcon[];
  colorScheme?: LinearStatusColorScheme;
}): LinearStatusIconModel {
  const workflowStates = input.workflowStates ?? [];
  const currentState = resolveCurrentWorkflowState(workflowStates, input.stateId, input.status);
  const stateType = normalizeStateType(currentState?.type ?? input.stateType);
  const statusColor = currentState?.color ?? input.statusColor;
  const colorScheme = input.colorScheme;

  if (stateType === "triage") {
    return { kind: "triage", color: resolveColor("triage", statusColor, colorScheme) };
  }
  if (stateType === "backlog") {
    return { kind: "backlog", color: resolveColor("backlog", statusColor, colorScheme) };
  }
  if (stateType === "completed") {
    return { kind: "completed", color: resolveColor("completed", statusColor, colorScheme) };
  }

  const fillRatio =
    workflowStates.length > 0 && currentState
      ? computeFillRatioFromWorkflowStates(workflowStates, currentState)
      : 0;

  return {
    kind: "ring",
    color: resolveColor(stateType || "started", statusColor, colorScheme),
    fillRatio: Math.max(0, Math.min(1, fillRatio)),
  };
}

const ICON_CENTER = 7;
/** Centerline radius of the outer ring stroke. */
export const LINEAR_STATUS_RING_RADIUS = 6;
export const LINEAR_STATUS_RING_STROKE_WIDTH = 1.5;
/** Gap between the filled wedge outer edge and the inner edge of the ring stroke. */
const PIE_RING_GAP = 1.75;
const PIE_RADIUS = LINEAR_STATUS_RING_RADIUS - LINEAR_STATUS_RING_STROKE_WIDTH / 2 - PIE_RING_GAP;

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const radians = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

export function describeLinearStatusPieWedge(
  fillRatio: number,
  radius: number = PIE_RADIUS,
): string {
  if (fillRatio <= 0) return "";

  const cx = ICON_CENTER;
  const cy = ICON_CENTER;

  if (fillRatio >= 1) {
    const top = polarToCartesian(cx, cy, radius, 0);
    return `M ${cx} ${cy} L ${top.x} ${top.y} A ${radius} ${radius} 0 1 1 ${top.x - 0.001} ${top.y} Z`;
  }

  const sweepAngle = fillRatio * 360;
  const start = polarToCartesian(cx, cy, radius, 0);
  const end = polarToCartesian(cx, cy, radius, sweepAngle);
  const largeArc = sweepAngle > 180 ? 1 : 0;

  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

export function linearStatusRingPath(): string {
  return `M13 7C13 3.686 10.314 1 7 1C3.686 1 1 3.686 1 7C1 10.314 3.686 13 7 13C10.314 13 13 10.314 13 7Z`;
}
