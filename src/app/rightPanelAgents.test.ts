import { describe, expect, test } from "bun:test";
import {
  panelChatComposerVariant,
  resolveRightPanelAgent,
  showsBacksterComposerOptions,
  supportsLinearPanelAgent,
} from "./rightPanelAgents";
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

const linearConnectedStatus: IntegrationsStatus = {
  ...baseStatus,
  linearApiKey: { configured: true },
};

describe("supportsLinearPanelAgent", () => {
  test("requires an open issue or linear document", () => {
    expect(
      supportsLinearPanelAgent({ activeLinearIssue: null, activeLinearDocument: null }),
    ).toBe(false);
    expect(
      supportsLinearPanelAgent({
        activeLinearIssue: { id: "i1", identifier: "BOS-1", title: "Issue" },
        activeLinearDocument: null,
      }),
    ).toBe(true);
    expect(
      supportsLinearPanelAgent({
        activeLinearIssue: null,
        activeLinearDocument: { id: "doc-1", title: "Doc" },
      }),
    ).toBe(true);
  });
});

describe("resolveRightPanelAgent", () => {
  test("uses cursor agent by default", () => {
    const resolved = resolveRightPanelAgent({
      integrationsStatus: baseStatus,
      activeLinearIssue: null,
      activeLinearDocument: null,
    });
    expect(resolved.requested).toBe("cursor");
    expect(resolved.active).toBe("cursor");
  });

  test("uses cursor on project tabs even when linear is connected", () => {
    const resolved = resolveRightPanelAgent({
      integrationsStatus: linearConnectedStatus,
      activeLinearIssue: null,
      activeLinearDocument: null,
    });
    expect(resolved.requested).toBe("cursor");
    expect(resolved.active).toBe("cursor");
  });

  test("uses linear agent when an issue is open and linear is connected", () => {
    const resolved = resolveRightPanelAgent({
      integrationsStatus: linearConnectedStatus,
      activeLinearIssue: { id: "i1", identifier: "BOS-1", title: "Issue" },
      activeLinearDocument: null,
    });
    expect(resolved.requested).toBe("linear");
    expect(resolved.active).toBe("linear");
  });

  test("uses linear agent when a linear document is open and linear is connected", () => {
    const resolved = resolveRightPanelAgent({
      integrationsStatus: linearConnectedStatus,
      activeLinearIssue: null,
      activeLinearDocument: { id: "doc-1", title: "Doc" },
    });
    expect(resolved.requested).toBe("linear");
    expect(resolved.active).toBe("linear");
  });

  test("falls back to cursor when linear is requested but not connected", () => {
    const resolved = resolveRightPanelAgent({
      integrationsStatus: baseStatus,
      activeLinearIssue: { id: "i1", identifier: "BOS-1", title: "Issue" },
      activeLinearDocument: null,
    });
    expect(resolved.requested).toBe("linear");
    expect(resolved.active).toBe("cursor");
    expect(resolved.fallbackReason).toContain("Connect Linear");
  });
});

describe("panel chat composer variants", () => {
  test("linear agent maps to linear composer variant", () => {
    expect(panelChatComposerVariant("linear")).toBe("linear");
    expect(panelChatComposerVariant("cursor")).toBe("backster");
  });

  test("backster composer options are hidden on linear panel", () => {
    expect(showsBacksterComposerOptions("panel", "linear")).toBe(false);
    expect(showsBacksterComposerOptions("panel", "backster")).toBe(true);
    expect(showsBacksterComposerOptions("default", "linear")).toBe(true);
  });
});
