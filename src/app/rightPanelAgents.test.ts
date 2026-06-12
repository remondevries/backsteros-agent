import { describe, expect, test } from "bun:test";
import { resolveRightPanelAgent } from "./rightPanelAgents";
import type { IntegrationsStatus } from "../lib/api";

const baseStatus: IntegrationsStatus = {
  cursorApiKey: { configured: true },
  linearApiKey: { configured: false },
  geminiApiKey: { configured: false },
  googleCalendar: {
    credentialsConfigured: false,
    authenticated: false,
    clientId: { configured: false },
    clientSecret: { configured: false },
  },
  linear: {
    credentialsConfigured: false,
    authenticated: false,
    clientId: { configured: false },
    clientSecret: { configured: false },
  },
};

describe("resolveRightPanelAgent", () => {
  test("uses cursor agent by default", () => {
    const resolved = resolveRightPanelAgent({
      activeView: "chat",
      integrationsStatus: baseStatus,
    });
    expect(resolved.requested).toBe("cursor");
    expect(resolved.active).toBe("cursor");
  });

  test("requests linear on linear view but falls back to cursor", () => {
    const resolved = resolveRightPanelAgent({
      activeView: "linear",
      integrationsStatus: baseStatus,
    });
    expect(resolved.requested).toBe("linear");
    expect(resolved.active).toBe("cursor");
    expect(resolved.fallbackReason).toContain("Connect Linear");
  });

  test("uses linear agent when linear focus is active and linear is connected", () => {
    const resolved = resolveRightPanelAgent({
      activeView: "chat",
      integrationsStatus: {
        ...baseStatus,
        linearApiKey: { configured: true },
      },
      hasLinearFocus: true,
    });
    expect(resolved.requested).toBe("linear");
    expect(resolved.active).toBe("linear");
  });

  test("uses linear agent on linear view when oauth is connected", () => {
    const resolved = resolveRightPanelAgent({
      activeView: "linear",
      integrationsStatus: {
        ...baseStatus,
        linear: {
          credentialsConfigured: true,
          authenticated: true,
          clientId: { configured: true },
          clientSecret: { configured: true },
        },
      },
    });
    expect(resolved.requested).toBe("linear");
    expect(resolved.active).toBe("linear");
  });
});
