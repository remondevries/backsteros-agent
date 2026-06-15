import { describe, expect, test } from "bun:test";
import { resolveAppReturnUrl } from "./config.ts";
import { buildConnectGatePageHtml } from "./connectGatePageHtml.ts";
import { buildOAuthCallbackPageHtml } from "./oauthCallbackPage.ts";

describe("resolveAppReturnUrl", () => {
  test("allows configured dev origins", () => {
    process.env.BACKSTER_DEV_AUTH = "1";
    expect(resolveAppReturnUrl("http://localhost:5173/inbox")).toBe("http://localhost:5173/inbox");
    expect(resolveAppReturnUrl("https://evil.example")).toBe("http://localhost:5173");
    delete process.env.BACKSTER_DEV_AUTH;
  });
});

describe("buildConnectGatePageHtml", () => {
  test("uses connect gate layout class names", () => {
    const html = buildConnectGatePageHtml({
      title: "Connect to Linear",
      description: "Sign in with Linear to continue.",
    });
    expect(html).toContain("app-shell linear-connect-gate");
    expect(html).toContain("linear-connect-gate-card linear-connect-gate-card--centered");
    expect(html).toContain("linear-connect-gate-title");
    expect(html).toContain("linear-connect-gate-description");
    expect(html).toContain("linear-connect-gate-brand--integration");
    expect(html).toContain("linear-connect-gate-brand--integration-pending\"");
  });

  test("escapes HTML in error descriptions", () => {
    const html = buildConnectGatePageHtml({
      title: "Failed",
      description: "<script>alert(1)</script>",
      variant: "error",
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("linear-connect-gate-description--error");
  });

  test("renders success continue action with setup progress", () => {
    const html = buildConnectGatePageHtml({
      title: "Connect to Linear",
      description: "Signed in.",
      successDashboardUrl: "http://localhost:5173/",
      progress: {
        activeStep: "linear",
        linearComplete: true,
        cursorComplete: false,
        setupComplete: false,
      },
    });
    expect(html).toContain("Continue...");
    expect(html).toContain("linear-connect-gate-stack");
    expect(html).toContain("connect-gate-progress");
    expect(html).toContain("Cursor Agent");
    expect(html).toContain("Setup");
    expect(html).toContain("linear-connect-gate-brand linear-connect-gate-brand--integration\"");
    expect(html).not.toContain("linear-connect-gate-brand--integration-pending\"");
    expect(html).not.toContain("Connected");
    expect(html).toContain('href="http://localhost:5173/"');
    expect(html).not.toContain("Close window");
  });
});

describe("buildOAuthCallbackPageHtml", () => {
  test("success page includes dashboard actions and setup progress", () => {
    process.env.BACKSTER_DEV_AUTH = "1";
    const html = buildOAuthCallbackPageHtml({
      title: "Connect to Linear",
      message: "You're signed in with Linear.",
      variant: "success",
      appReturnUrl: "http://localhost:5173",
      connectProgress: {
        activeStep: "linear",
        linearComplete: true,
        cursorComplete: false,
        setupComplete: false,
      },
    });
    expect(html).toContain("Continue...");
    expect(html).toContain("connect-gate-progress");
    expect(html).toContain("linear-connect-gate-stack");
    expect(html).toContain("linear-connect-gate-brand linear-connect-gate-brand--integration\"");
    expect(html).not.toContain("linear-connect-gate-brand--integration-pending\"");
    expect(html).not.toContain("Connected");
    expect(html).not.toContain("Close window");
    expect(html).not.toContain("Continue with Linear");
    delete process.env.BACKSTER_DEV_AUTH;
  });
});
