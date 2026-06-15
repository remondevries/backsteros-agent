export type LinearProjectStatus = {
  id: string;
  name: string;
  type: string;
  position?: number;
};

export type LinearProjectWithStatus = {
  id: string;
  name: string;
  slugId?: string;
  status?: LinearProjectStatus | null;
};

export type LinearProjectGroup = {
  status: LinearProjectStatus | null;
  label: string;
  projects: LinearProjectWithStatus[];
};

/** Display order for project status groups. */
const PROJECT_STATUS_TYPE_ORDER: Record<string, number> = {
  started: 0,
  planned: 1,
  paused: 1.5,
  backlog: 2,
  completed: 3,
  canceled: 4,
  cancelled: 4,
};

function normalizeProjectStatusType(type?: string): string {
  return type?.trim().toLowerCase() ?? "";
}

function projectStatusTypeSortKey(type?: string): number {
  const normalized = normalizeProjectStatusType(type);
  if (normalized in PROJECT_STATUS_TYPE_ORDER) {
    return PROJECT_STATUS_TYPE_ORDER[normalized]!;
  }
  return 99;
}

function compareProjectStatusesForDisplay(
  left: LinearProjectStatus,
  right: LinearProjectStatus,
): number {
  const typeDiff = projectStatusTypeSortKey(left.type) - projectStatusTypeSortKey(right.type);
  if (typeDiff !== 0) return typeDiff;

  const leftPosition = Number.isFinite(left.position) ? Number(left.position) : Number.NaN;
  const rightPosition = Number.isFinite(right.position) ? Number(right.position) : Number.NaN;
  if (
    Number.isFinite(leftPosition) &&
    Number.isFinite(rightPosition) &&
    leftPosition !== rightPosition
  ) {
    return leftPosition - rightPosition;
  }
  if (Number.isFinite(leftPosition) && !Number.isFinite(rightPosition)) return -1;
  if (!Number.isFinite(leftPosition) && Number.isFinite(rightPosition)) return 1;

  return left.name.localeCompare(right.name);
}

export function sortLinearProjectStatusesForDisplay(
  statuses: LinearProjectStatus[],
): LinearProjectStatus[] {
  return [...statuses].sort(compareProjectStatusesForDisplay);
}

function compareProjectGroups(left: LinearProjectGroup, right: LinearProjectGroup): number {
  const leftType = projectStatusTypeSortKey(left.status?.type);
  const rightType = projectStatusTypeSortKey(right.status?.type);
  if (leftType !== rightType) return leftType - rightType;

  const leftPosition = left.status?.position;
  const rightPosition = right.status?.position;
  if (leftPosition != null && rightPosition != null && leftPosition !== rightPosition) {
    return leftPosition - rightPosition;
  }

  return left.label.localeCompare(right.label);
}

function sortProjectsInGroup(projects: LinearProjectWithStatus[]): LinearProjectWithStatus[] {
  return [...projects].sort((left, right) => left.name.localeCompare(right.name));
}

export function groupLinearProjectsByStatus(
  projects: LinearProjectWithStatus[],
): LinearProjectGroup[] {
  const groups = new Map<string, LinearProjectGroup>();

  for (const project of projects) {
    const status = project.status ?? null;
    const key = status?.id ?? "__none__";
    const existing = groups.get(key);
    if (existing) {
      existing.projects.push(project);
      continue;
    }

    groups.set(key, {
      status,
      label: status?.name ?? "No status",
      projects: [project],
    });
  }

  for (const group of groups.values()) {
    group.projects = sortProjectsInGroup(group.projects);
  }

  return [...groups.values()].sort(compareProjectGroups);
}

/** Groups projects under every workspace project status, including empty columns. */
export function groupLinearProjectsByWorkflow(
  projects: LinearProjectWithStatus[],
  workspaceStatuses: LinearProjectStatus[],
): LinearProjectGroup[] {
  if (workspaceStatuses.length === 0) {
    return groupLinearProjectsByStatus(projects);
  }

  const sortedStatuses = sortLinearProjectStatusesForDisplay(workspaceStatuses);
  const statusIds = new Set(sortedStatuses.map((status) => status.id));
  const projectsByStatusId = new Map<string, LinearProjectWithStatus[]>();
  const unmatchedProjects: LinearProjectWithStatus[] = [];

  for (const project of projects) {
    const statusId = project.status?.id;
    if (!statusId || !statusIds.has(statusId)) {
      unmatchedProjects.push(project);
      continue;
    }

    const list = projectsByStatusId.get(statusId) ?? [];
    list.push(project);
    projectsByStatusId.set(statusId, list);
  }

  const workflowGroups: LinearProjectGroup[] = sortedStatuses.map((status) => ({
    status,
    label: status.name,
    projects: sortProjectsInGroup(projectsByStatusId.get(status.id) ?? []),
  }));

  if (unmatchedProjects.length === 0) {
    return workflowGroups;
  }

  return [...workflowGroups, ...groupLinearProjectsByStatus(unmatchedProjects)];
}
