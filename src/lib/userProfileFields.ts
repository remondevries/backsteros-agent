export type UserProfileFields = {
  name: string;
  timezone: string;
  city: string;
  role: string;
};

const NAME_LINE = /^-\s*Name:\s*(.+)$/i;
const TIMEZONE_LINE = /^-\s*Timezone:\s*(.+)$/i;
const CITY_LINE = /^-\s*City:\s*(.+)$/i;
const ROLE_LINE = /^-\s*Role:\s*(.+)$/i;

function matchProfileLine(content: string, pattern: RegExp): string {
  for (const line of content.split("\n")) {
    const match = line.trim().match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return "";
}

export function parseUserProfileFields(content: string): UserProfileFields {
  return {
    name: matchProfileLine(content, NAME_LINE),
    timezone: matchProfileLine(content, TIMEZONE_LINE),
    city: matchProfileLine(content, CITY_LINE),
    role: matchProfileLine(content, ROLE_LINE),
  };
}

export function buildUserProfileMarkdown(fields: UserProfileFields): string {
  const name = fields.name.trim();
  const timezone = fields.timezone.trim();
  const city = fields.city.trim();
  const role = fields.role.trim();

  return `# User profile

BacksterOS Agent reads this file on every turn for identity and timezone context.
Edit the fields below to match you.

- Name: ${name}
- Timezone: ${timezone}
- City: ${city}
- Role: ${role}
`;
}

export function defaultBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    return "";
  }
}
