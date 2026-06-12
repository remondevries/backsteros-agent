import { describe, expect, test } from "bun:test";
import {
  getGoogleCalendarStatusLabel,
  getSettingsTabStatusLabel,
  isGoogleCalendarConnected,
  isSettingsTabConnected,
} from "./integrationConnectionStatus";

describe("integrationConnectionStatus", () => {
  const status = {
    cursorApiKey: { configured: true },
    linearApiKey: { configured: false },
    geminiApiKey: { configured: true },
    googleCalendar: {
      credentialsConfigured: true,
      authenticated: false,
      clientId: { configured: true, preview: "...com" },
      clientSecret: { configured: true, preview: "...cret" },
    },
    linear: {
      credentialsConfigured: false,
      authenticated: false,
      clientId: { configured: false },
      clientSecret: { configured: false },
    },
  };

  const context = {
    integrationsStatus: status,
    savedNotesPath: "/Users/me/notes",
  };

  test("marks configured API key integrations as connected", () => {
    expect(isSettingsTabConnected("cursor", context)).toBe(true);
    expect(isSettingsTabConnected("linear", context)).toBe(false);
    expect(isSettingsTabConnected("gemini", context)).toBe(true);
    expect(
      isSettingsTabConnected("linear", {
        ...context,
        integrationsStatus: {
          ...status,
          linear: {
            credentialsConfigured: true,
            authenticated: true,
            clientId: { configured: true },
            clientSecret: { configured: true },
          },
        },
      }),
    ).toBe(true);
  });

  test("requires Google Calendar credentials and authentication", () => {
    expect(isSettingsTabConnected("google-calendar", context)).toBe(false);
    expect(
      isSettingsTabConnected("google-calendar", {
        ...context,
        integrationsStatus: {
          ...status,
          googleCalendar: { credentialsConfigured: true, authenticated: true, clientId: { configured: true }, clientSecret: { configured: true } },
        },
      }),
    ).toBe(true);
  });

  test("does not treat orphaned calendar tokens as connected", () => {
    const orphaned = {
      ...context,
      integrationsStatus: {
        ...status,
        googleCalendar: {
          credentialsConfigured: false,
          authenticated: true,
          clientId: { configured: false },
          clientSecret: { configured: false },
        },
      },
    };

    expect(isGoogleCalendarConnected(orphaned.integrationsStatus!.googleCalendar)).toBe(false);
    expect(getGoogleCalendarStatusLabel(orphaned.integrationsStatus!.googleCalendar)).toBe(
      "Missing OAuth credentials",
    );
    expect(isSettingsTabConnected("google-calendar", orphaned)).toBe(false);
  });

  test("tracks Obsidian vault selection from saved notes path", () => {
    expect(isSettingsTabConnected("obsidian", context)).toBe(true);
    expect(
      isSettingsTabConnected("obsidian", {
        ...context,
        savedNotesPath: null,
      }),
    ).toBe(false);
    expect(
      getSettingsTabStatusLabel("obsidian", {
        ...context,
        savedNotesPath: "",
      }),
    ).toBe("Not connected");
  });
});
