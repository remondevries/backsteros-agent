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

const STATUS_TYPE_ORDER: Record<string, number> = {
  backlog: 0,
  planned: 1,
  started: 2,
  completed: 3,
  canceled: 4,
};

function statusTypeRank(type: string | undefined): number {
  if (!type) return 99;
  return STATUS_TYPE_ORDER[type.toLowerCase()] ?? 99;
}

function compareProjectGroups(left: LinearProjectGroup, right: LinearProjectGroup): number {
  const leftType = statusTypeRank(left.status?.type);
  const rightType = statusTypeRank(right.status?.type);
  if (leftType !== rightType) return leftType - rightType;

  const leftPosition = left.status?.position;
  const rightPosition = right.status?.position;
  if (leftPosition != null && rightPosition != null && leftPosition !== rightPosition) {
    return leftPosition - rightPosition;
  }

  return left.label.localeCompare(right.label);
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
    group.projects.sort((left, right) => left.name.localeCompare(right.name));
  }

  return [...groups.values()].sort(compareProjectGroups);
}
