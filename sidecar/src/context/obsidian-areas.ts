export type ObsidianArea =
  | "daily"
  | "projects"
  | "inbox"
  | "meetings"
  | "letters"
  | "contacts"
  | "organizations"
  | "specs"
  | "archive";

const AREA_PATTERNS: Record<ObsidianArea, RegExp[]> = {
  daily: [
    /\bdaily\b/i,
    /\bjournal\b/i,
    /\bDaily\//,
    /\btoday(?:'s)? note\b/i,
    /\b\d{4}-\d{2}-\d{2}\b/,
  ],
  projects: [/\bprojects?\b/i, /\bProjects\//],
  inbox: [/\binbox\b/i, /\bInbox\//, /\bcapture\b/i, /\bquick note\b/i],
  meetings: [/\bmeetings?\b/i, /\bMeetings\//],
  letters: [/\bletters?\b/i, /\bLetters\//],
  contacts: [/\bcontacts?\b/i, /\bContacts\//],
  organizations: [
    /\borganizations?\b/i,
    /\borganisations?\b/i,
    /\bOrganizations\//,
    /\bOrganisations\//,
  ],
  specs: [/\bspecs?\b/i, /\bspecifications?\b/i, /\bspecs\//],
  archive: [/\barchive\b/i, /\bArchive\//],
};

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function selectObsidianAreas(text: string): ObsidianArea[] {
  const areas: ObsidianArea[] = [];
  for (const [area, patterns] of Object.entries(AREA_PATTERNS) as Array<
    [ObsidianArea, RegExp[]]
  >) {
    if (matchesAny(text, patterns)) {
      areas.push(area);
    }
  }
  return areas;
}

export function inferAreasFromPaths(paths: string[]): ObsidianArea[] {
  const areas = new Set<ObsidianArea>();
  for (const path of paths) {
    const topFolder = path.replace(/\\/g, "/").split("/").filter(Boolean)[0]?.toLowerCase() ?? "";
    switch (topFolder) {
      case "daily":
        areas.add("daily");
        break;
      case "projects":
      case "project":
        areas.add("projects");
        break;
      case "inbox":
        areas.add("inbox");
        break;
      case "meetings":
      case "meeting":
        areas.add("meetings");
        break;
      case "letters":
      case "letter":
        areas.add("letters");
        break;
      case "contacts":
      case "contact":
        areas.add("contacts");
        break;
      case "organizations":
      case "organisation":
      case "organisations":
        areas.add("organizations");
        break;
      case "specs":
      case "spec":
        areas.add("specs");
        break;
      case "archive":
        areas.add("archive");
        break;
      default:
        break;
    }
  }
  return [...areas];
}
