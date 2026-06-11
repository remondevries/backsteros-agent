import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { getLinearApiKey } from "./config.ts";
import { fetchLinearProjectsPage } from "./linear/projects.ts";
import { fetchLinearTeams, type LinearTeamSummary } from "./linear/teams.ts";
import {
  CONTACTS_FOLDER,
  getLetterFilingOptions,
  ORGANIZATIONS_FOLDER,
  PROJECTS_FOLDER,
} from "./letter-options.ts";
import {
  dedupeAliases,
  readAliasesFromNote,
  resolveContactNotePath,
  resolveOrganizationNotePath,
  resolveProjectNotePath,
} from "./vault-aliases.ts";

export interface CatalogEntity {
  name: string;
  path: string;
  aliases: string[];
}

export interface LinearCatalogEntity {
  id: string;
  name: string;
  key?: string;
}

export interface LetterMatchCatalog {
  contacts: CatalogEntity[];
  organizations: CatalogEntity[];
  projects: CatalogEntity[];
  linearTeams: LinearCatalogEntity[];
  linearProjects: LinearCatalogEntity[];
}

function listProjectNames(notesPath: string): string[] {
  const dir = join(notesPath, PROJECTS_FOLDER);
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

function buildContactCatalog(notesPath: string, names: string[]): CatalogEntity[] {
  return names.map((name) => {
    const path = resolveContactNotePath(notesPath, name);
    return {
      name,
      path: join(CONTACTS_FOLDER, `${name}.md`),
      aliases: readAliasesFromNote(path),
    };
  });
}

function buildOrganizationCatalog(notesPath: string, names: string[]): CatalogEntity[] {
  return names.map((name) => {
    const path = resolveOrganizationNotePath(notesPath, name);
    return {
      name,
      path: join(ORGANIZATIONS_FOLDER, `${name}.md`),
      aliases: readAliasesFromNote(path),
    };
  });
}

function buildProjectCatalog(notesPath: string, names: string[]): CatalogEntity[] {
  return names.map((name) => {
    const absPath = resolveProjectNotePath(notesPath, name);
    const relPath = absPath
      ? absPath.replace(`${notesPath}/`, "").replace(/\\/g, "/")
      : join(PROJECTS_FOLDER, name, `${name}.md`);
    return {
      name,
      path: relPath,
      aliases: absPath ? readAliasesFromNote(absPath) : [],
    };
  });
}

export async function buildLetterMatchCatalog(notesPath: string): Promise<LetterMatchCatalog> {
  const options = getLetterFilingOptions(notesPath);
  const projectNames = listProjectNames(notesPath);

  let linearTeams: LinearTeamSummary[] = [];
  let linearProjects: LinearCatalogEntity[] = [];

  if (getLinearApiKey()) {
    try {
      linearTeams = await fetchLinearTeams();
    } catch {
      linearTeams = [];
    }

    try {
      const page = await fetchLinearProjectsPage({ first: 50 });
      linearProjects = page.projects.map((project) => ({
        id: project.id,
        name: project.name,
      }));
    } catch {
      linearProjects = [];
    }
  }

  return {
    contacts: buildContactCatalog(notesPath, options.contacts),
    organizations: buildOrganizationCatalog(notesPath, options.organizations),
    projects: buildProjectCatalog(notesPath, projectNames),
    linearTeams: linearTeams.map((team) => ({
      id: team.id,
      name: team.name,
      key: team.key,
    })),
    linearProjects,
  };
}

export function normalizeMatchText(value: string): string {
  return value
    .trim()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function matchCatalogEntityByNameOrAlias(
  needle: string,
  entities: CatalogEntity[],
): CatalogEntity | null {
  const normalizedNeedle = normalizeMatchText(needle);
  if (!normalizedNeedle) return null;

  for (const entity of entities) {
    if (normalizeMatchText(entity.name) === normalizedNeedle) {
      return entity;
    }
    for (const alias of entity.aliases) {
      if (normalizeMatchText(alias) === normalizedNeedle) {
        return entity;
      }
    }
  }

  for (const entity of entities) {
    const entityName = normalizeMatchText(entity.name);
    if (entityName.includes(normalizedNeedle) || normalizedNeedle.includes(entityName)) {
      return entity;
    }
    for (const alias of entity.aliases) {
      const normalizedAlias = normalizeMatchText(alias);
      if (
        normalizedAlias.includes(normalizedNeedle) ||
        normalizedNeedle.includes(normalizedAlias)
      ) {
        return entity;
      }
    }
  }

  if (!normalizedNeedle.includes(" ")) {
    for (const entity of entities) {
      const nameWords = normalizeMatchText(entity.name).split(" ");
      if (nameWords.some((word) => word === normalizedNeedle)) {
        return entity;
      }
      for (const alias of entity.aliases) {
        const aliasWords = normalizeMatchText(alias).split(" ");
        if (aliasWords.some((word) => word === normalizedNeedle)) {
          return entity;
        }
      }
    }
  }

  return null;
}

export function matchLinearTeamByName(
  needle: string,
  teams: LinearCatalogEntity[],
): LinearCatalogEntity | null {
  const normalizedNeedle = normalizeMatchText(needle);
  if (!normalizedNeedle) return null;

  for (const team of teams) {
    if (normalizeMatchText(team.name) === normalizedNeedle) return team;
    if (team.key && normalizeMatchText(team.key) === normalizedNeedle) return team;
  }

  for (const team of teams) {
    const teamName = normalizeMatchText(team.name);
    if (teamName.includes(normalizedNeedle) || normalizedNeedle.includes(teamName)) {
      return team;
    }
  }

  return null;
}

/** Resolve organization only to a Linear team (vault org aliases may map OCR text to a team). */
export function matchOrganizationToLinearTeam(
  needle: string,
  catalog: LetterMatchCatalog,
): LinearCatalogEntity | null {
  const direct = matchLinearTeamByName(needle, catalog.linearTeams);
  if (direct) return direct;

  const vaultOrg = matchCatalogEntityByNameOrAlias(needle, catalog.organizations);
  if (!vaultOrg) return null;

  return matchLinearTeamByName(vaultOrg.name, catalog.linearTeams);
}

export function matchLinearProjectByName(
  needle: string,
  projects: LinearCatalogEntity[],
): LinearCatalogEntity | null {
  const normalizedNeedle = normalizeMatchText(needle);
  if (!normalizedNeedle) return null;

  for (const project of projects) {
    if (normalizeMatchText(project.name) === normalizedNeedle) return project;
  }

  for (const project of projects) {
    const projectName = normalizeMatchText(project.name);
    if (projectName.includes(normalizedNeedle) || normalizedNeedle.includes(projectName)) {
      return project;
    }
  }

  return null;
}

export function formatCatalogForPrompt(catalog: LetterMatchCatalog): string {
  const contactLines = catalog.contacts.map((entity) => {
    const aliasText =
      entity.aliases.length > 0 ? `; aliases: ${dedupeAliases(entity.aliases).join(", ")}` : "";
    return `- ${entity.name}${aliasText}`;
  });

  const orgLines = catalog.organizations.map((entity) => {
    const aliasText =
      entity.aliases.length > 0 ? `; aliases: ${dedupeAliases(entity.aliases).join(", ")}` : "";
    return `- ${entity.name}${aliasText}`;
  });

  const teamLines = catalog.linearTeams.map(
    (team) => `- ${team.name}${team.key ? ` (${team.key})` : ""} [id: ${team.id}]`,
  );

  const projectLines = catalog.linearProjects.map(
    (project) => `- ${project.name} [id: ${project.id}]`,
  );

  return [
    "Contacts:",
    ...(contactLines.length > 0 ? contactLines : ["- (none)"]),
    "",
    "Vault organizations (alias lookup only — canonical name must match a Linear team):",
    ...(orgLines.length > 0 ? orgLines : ["- (none)"]),
    "",
    "Linear teams (preferred for organization field):",
    ...(teamLines.length > 0 ? teamLines : ["- (none)"]),
    "",
    "Linear projects:",
    ...(projectLines.length > 0 ? projectLines : ["- (none)"]),
  ].join("\n");
}
