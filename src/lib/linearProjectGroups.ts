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

function normalizeProjectStatusName(name?: string): string {
  return name?.trim().toLowerCase() ?? "";
}

function assignProjectToWorkflowStatus(
  project: LinearProjectWithStatus,
  workspaceStatuses: LinearProjectStatus[],
): LinearProjectStatus | null {
  const statusId = project.status?.id?.trim();
  if (statusId) {
    const byId = workspaceStatuses.find((status) => status.id === statusId);
    if (byId) return byId;
  }

  const normalizedName = normalizeProjectStatusName(project.status?.name);
  if (!normalizedName) return null;

  return (
    workspaceStatuses.find(
      (status) => normalizeProjectStatusName(status.name) === normalizedName,
    ) ?? null
  );
}

function canonicalizeProjectStatusesForGrouping(
  statuses: LinearProjectStatus[],
): {
  displayStatuses: LinearProjectStatus[];
  resolveStatus: (status: LinearProjectStatus) => LinearProjectStatus;
} {
  const sortedStatuses = sortLinearProjectStatusesForDisplay(statuses);
  const displayStatuses: LinearProjectStatus[] = [];
  const canonicalByName = new Map<string, LinearProjectStatus>();
  const resolveById = new Map<string, LinearProjectStatus>();

  for (const status of sortedStatuses) {
    const nameKey = normalizeProjectStatusName(status.name);
    let canonical = nameKey ? canonicalByName.get(nameKey) : undefined;
    if (!canonical) {
      canonical = status;
      if (nameKey) {
        canonicalByName.set(nameKey, canonical);
      }
      displayStatuses.push(canonical);
    }
    resolveById.set(status.id, canonical);
  }

  return {
    displayStatuses,
    resolveStatus: (status) => resolveById.get(status.id) ?? status,
  };
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
  const { displayStatuses, resolveStatus } = canonicalizeProjectStatusesForGrouping(sortedStatuses);
  const projectsByStatusId = new Map<string, LinearProjectWithStatus[]>();
  const unmatchedProjects: LinearProjectWithStatus[] = [];

  for (const project of projects) {
    const matchedStatus = assignProjectToWorkflowStatus(project, sortedStatuses);
    if (!matchedStatus) {
      unmatchedProjects.push(project);
      continue;
    }

    const canonicalStatus = resolveStatus(matchedStatus);
    const list = projectsByStatusId.get(canonicalStatus.id) ?? [];
    list.push(project);
    projectsByStatusId.set(canonicalStatus.id, list);
  }

  const workflowGroups: LinearProjectGroup[] = displayStatuses.map((status) => ({
    status,
    label: status.name,
    projects: sortProjectsInGroup(projectsByStatusId.get(status.id) ?? []),
  }));

  if (unmatchedProjects.length === 0) {
    return workflowGroups;
  }

  const workflowStatusNames = new Set(
    workflowGroups.map((group) => normalizeProjectStatusName(group.label)),
  );
  const extraGroups = groupLinearProjectsByStatus(unmatchedProjects).filter(
    (group) => !workflowStatusNames.has(normalizeProjectStatusName(group.label)),
  );

  return extraGroups.length > 0 ? [...workflowGroups, ...extraGroups] : workflowGroups;
}
