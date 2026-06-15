import {
  resolveLinearStatusColor,
  type LinearStatusColorScheme,
} from "./linearStatusColor";
import {
  LINEAR_STATUS_RING_RADIUS,
  LINEAR_STATUS_RING_STROKE_WIDTH,
  sortLinearWorkflowStates,
  type LinearWorkflowStateForIcon,
} from "./linearStatusIcon";

export type LinearProjectStatusForIcon = LinearWorkflowStateForIcon;

export type LinearProjectStatusIconModel =
  | { kind: "completed"; color: string }
  | { kind: "hexagon"; color: string; fillRatio: number };

const PROJECT_WEDGE_FILL_TYPES = new Set(["planned", "started", "completed"]);

const PROJECT_TYPE_POSITION_BASE: Record<string, number> = {
  planned: 0,
  started: 100,
  completed: 200,
};
const PROJECT_TYPE_POSITION_BAND = 100;
/** Planned = 0% wedge, completed = 100% wedge on the project status scale. */
const PROJECT_WEDGE_RANGE_MIN = PROJECT_TYPE_POSITION_BASE.planned;
const PROJECT_WEDGE_RANGE_MAX = PROJECT_TYPE_POSITION_BASE.completed;

const ICON_CENTER = 7;
const PIE_RING_GAP = 1.75;
const HEX_PIE_RADIUS =
  LINEAR_STATUS_RING_RADIUS - LINEAR_STATUS_RING_STROKE_WIDTH / 2 - PIE_RING_GAP;

function normalizeStateType(value?: string): string {
  return value?.trim().toLowerCase() ?? "";
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const radians = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

export function describeLinearProjectStatusHexagonPath(
  radius: number = LINEAR_STATUS_RING_RADIUS,
): string {
  const points = Array.from({ length: 6 }, (_, index) => {
    const point = polarToCartesian(ICON_CENTER, ICON_CENTER, radius, index * 60);
    return `${point.x} ${point.y}`;
  });
  return `M ${points.join(" L ")} Z`;
}

/** Inner checkmark for completed project hex icons (16×16 source, scaled in the icon). */
export const LINEAR_PROJECT_COMPLETED_CHECK_PATH =
  "M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z";

export const LINEAR_PROJECT_COMPLETED_CHECK_VIEWBOX_SIZE = 16;
export const LINEAR_PROJECT_STATUS_ICON_VIEWBOX_SIZE = 14;
/** Check size relative to the fitted 16→14 scale (0–1). */
export const LINEAR_PROJECT_COMPLETED_CHECK_SIZE_RATIO = 0.68;

export function describeLinearProjectCompletedCheckTransform(): string {
  const fitScale =
    LINEAR_PROJECT_STATUS_ICON_VIEWBOX_SIZE / LINEAR_PROJECT_COMPLETED_CHECK_VIEWBOX_SIZE;
  const scale = Math.round(fitScale * LINEAR_PROJECT_COMPLETED_CHECK_SIZE_RATIO * 1000) / 1000;
  const checkCenter = LINEAR_PROJECT_COMPLETED_CHECK_VIEWBOX_SIZE / 2;
  const iconCenter = LINEAR_PROJECT_STATUS_ICON_VIEWBOX_SIZE / 2;
  return `translate(${iconCenter} ${iconCenter}) scale(${scale}) translate(${-checkCenter} ${-checkCenter})`;
}

export function describeLinearProjectStatusPieWedge(fillRatio: number): string {
  if (fillRatio <= 0) return "";

  const cx = ICON_CENTER;
  const cy = ICON_CENTER;
  const radius = HEX_PIE_RADIUS;

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

function hasProjectWedgeFill(type?: string): boolean {
  return PROJECT_WEDGE_FILL_TYPES.has(normalizeStateType(type));
}

function filterProjectWedgeFillStatuses(
  projectStatuses: LinearProjectStatusForIcon[],
): LinearProjectStatusForIcon[] {
  return sortLinearWorkflowStates(projectStatuses).filter((state) =>
    hasProjectWedgeFill(state.type),
  );
}

function resolveCurrentProjectStatus(
  projectStatuses: LinearProjectStatusForIcon[],
  input: {
    stateId?: string | null;
    status?: string;
    stateType?: string;
    statusPosition?: number;
    statusColor?: string;
  },
): LinearProjectStatusForIcon | null {
  const trimmedStateId = input.stateId?.trim();
  if (trimmedStateId) {
    const byId = projectStatuses.find((state) => state.id === trimmedStateId);
    if (byId) return byId;
  }

  const normalizedStatus = input.status?.trim().toLowerCase() ?? "";
  if (normalizedStatus) {
    const byName = projectStatuses.find(
      (state) => state.name.trim().toLowerCase() === normalizedStatus,
    );
    if (byName) return byName;
  }

  if (trimmedStateId && input.status?.trim() && input.stateType?.trim()) {
    return {
      id: trimmedStateId,
      name: input.status.trim(),
      type: input.stateType.trim(),
      position: input.statusPosition,
      color: input.statusColor,
    };
  }

  return null;
}

function readProjectStatusPosition(state: LinearProjectStatusForIcon): number | null {
  return Number.isFinite(state.position) ? Number(state.position) : null;
}

function sortSameTypeProjectStatuses(
  states: LinearProjectStatusForIcon[],
): LinearProjectStatusForIcon[] {
  return [...states].sort((left, right) => {
    const leftPosition = readProjectStatusPosition(left);
    const rightPosition = readProjectStatusPosition(right);
    if (
      leftPosition != null &&
      rightPosition != null &&
      leftPosition !== rightPosition
    ) {
      return leftPosition - rightPosition;
    }
    if (leftPosition != null && rightPosition == null) return -1;
    if (leftPosition == null && rightPosition != null) return 1;
    return left.name.localeCompare(right.name);
  });
}

function resolveWedgeStatusPosition(
  status: LinearProjectStatusForIcon,
  wedgeStates: LinearProjectStatusForIcon[],
): number {
  const type = normalizeStateType(status.type);
  const base = PROJECT_TYPE_POSITION_BASE[type] ?? 100;
  const sameType = wedgeStates.filter(
    (candidate) => normalizeStateType(candidate.type) === type,
  );

  if (sameType.length <= 1) {
    return base;
  }

  const ordered = sortSameTypeProjectStatuses(sameType);
  const index = Math.max(0, ordered.findIndex((candidate) => candidate.id === status.id));
  const maxIndex = Math.max(ordered.length - 1, 1);
  const withinTypeOffset = (index / maxIndex) * (PROJECT_TYPE_POSITION_BAND - 1);
  return base + withinTypeOffset;
}

export function computeLinearProjectStatusFillRatio(
  projectStatuses: LinearProjectStatusForIcon[],
  currentStatus: LinearProjectStatusForIcon,
): number {
  const currentType = normalizeStateType(currentStatus.type);
  if (currentType === "completed") {
    return 1;
  }

  if (!hasProjectWedgeFill(currentStatus.type)) {
    return 0;
  }

  const wedgeStates = filterProjectWedgeFillStatuses(projectStatuses);
  if (wedgeStates.length === 0) {
    return 0;
  }

  const range = PROJECT_WEDGE_RANGE_MAX - PROJECT_WEDGE_RANGE_MIN;
  if (range <= 0) {
    return 0;
  }

  const currentPosition = resolveWedgeStatusPosition(currentStatus, wedgeStates);
  return (currentPosition - PROJECT_WEDGE_RANGE_MIN) / range;
}

function resolveProjectStatusFillRatio(
  projectStatuses: LinearProjectStatusForIcon[],
  currentStatus: LinearProjectStatusForIcon | null,
  stateType: string,
): number {
  if (!hasProjectWedgeFill(stateType)) {
    return 0;
  }

  if (currentStatus && projectStatuses.length > 0) {
    return computeLinearProjectStatusFillRatio(projectStatuses, currentStatus);
  }

  return 0;
}

export function computeLinearProjectStatusIconModel(input: {
  stateId?: string | null;
  stateType?: string;
  status?: string;
  statusColor?: string;
  statusPosition?: number;
  projectStatuses?: LinearProjectStatusForIcon[];
  colorScheme?: LinearStatusColorScheme;
}): LinearProjectStatusIconModel {
  const projectStatuses = input.projectStatuses ?? [];
  const currentStatus = resolveCurrentProjectStatus(projectStatuses, {
    stateId: input.stateId,
    status: input.status,
    stateType: input.stateType,
    statusPosition: input.statusPosition,
    statusColor: input.statusColor,
  });
  const stateType = normalizeStateType(currentStatus?.type ?? input.stateType);
  const statusColor = currentStatus?.color ?? input.statusColor;
  const colorScheme = input.colorScheme;
  const color = resolveLinearStatusColor(stateType || "started", statusColor, { colorScheme });

  if (stateType === "completed") {
    return { kind: "completed", color };
  }

  const fillRatio = hasProjectWedgeFill(stateType)
    ? resolveProjectStatusFillRatio(projectStatuses, currentStatus, stateType)
    : 0;

  return {
    kind: "hexagon",
    color,
    fillRatio: Math.max(0, Math.min(1, fillRatio)),
  };
}

export function collectLinearProjectStatusesFromProjects<
  T extends { status?: LinearProjectStatusForIcon | null },
>(projects: T[]): LinearProjectStatusForIcon[] {
  const byId = new Map<string, LinearProjectStatusForIcon>();
  for (const project of projects) {
    const status = project.status;
    if (!status?.id?.trim() || !status.name?.trim() || !status.type?.trim()) continue;
    byId.set(status.id, {
      id: status.id,
      name: status.name,
      type: status.type,
      position: status.position,
      color: status.color,
    });
  }
  return sortLinearWorkflowStates([...byId.values()]);
}

/** Prefer workspace project statuses; fall back to statuses inferred from loaded projects. */
export function resolveLinearProjectStatusesForIcons(
  workspaceStatuses: LinearProjectStatusForIcon[] | undefined,
  projects: Array<{ status?: LinearProjectStatusForIcon | null }>,
): LinearProjectStatusForIcon[] {
  if (workspaceStatuses?.length) {
    return sortLinearWorkflowStates(workspaceStatuses);
  }
  return collectLinearProjectStatusesFromProjects(projects);
}
