import { existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { linearGraphqlRequest } from "./linear/graphql.ts";
import { ensureVaultNavFolders } from "./vault-nav-structure.ts";

export const LINEAR_WORKSPACE_VAULT_SECTIONS = ["Letters", "Meetings", "Organizations"] as const;

export type LinearWorkspaceVaultSection = (typeof LINEAR_WORKSPACE_VAULT_SECTIONS)[number];

function ensureDirectory(notesPath: string, relativePath: string, created: string[]): void {
  const abs = join(notesPath, relativePath);
  if (existsSync(abs)) return;
  mkdirSync(abs, { recursive: true });
  created.push(relativePath.replace(/\\/g, "/"));
}

async function resolveTeamIdForProject(projectId: string): Promise<string | null> {
  const data = await linearGraphqlRequest<{
    project?: {
      teams?: {
        nodes?: Array<{ id?: string | null } | null> | null;
      } | null;
    } | null;
  }>(
    `
      query LinearProjectTeam($id: String!) {
        project(id: $id) {
          teams(first: 1) {
            nodes {
              id
            }
          }
        }
      }
    `,
    { id: projectId },
  );

  for (const node of data.project?.teams?.nodes ?? []) {
    const id = node?.id?.trim();
    if (id) return id;
  }

  return null;
}

export async function ensureLinearWorkspaceVaultStructure(
  notesPath: string,
  options: {
    teamId?: string | null;
    projectId?: string | null;
  },
): Promise<string[]> {
  if (!existsSync(notesPath) || !statSync(notesPath).isDirectory()) {
    throw new Error("Notes folder does not exist");
  }

  let teamId = options.teamId?.trim() || null;
  const projectId = options.projectId?.trim() || null;

  if (!teamId && projectId) {
    teamId = await resolveTeamIdForProject(projectId);
  }

  if (!teamId) {
    throw new Error("A Linear team id is required to create workspace folders");
  }

  ensureVaultNavFolders(notesPath);

  const created: string[] = [];
  for (const section of LINEAR_WORKSPACE_VAULT_SECTIONS) {
    const teamPath = `${section}/${teamId}`;
    ensureDirectory(notesPath, teamPath, created);
    if (projectId) {
      ensureDirectory(notesPath, `${teamPath}/${projectId}`, created);
    }
  }

  return created;
}
