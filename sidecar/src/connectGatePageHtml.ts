/**
 * Standalone HTML for OAuth callback tabs — keep layout/CSS in sync with
 * `ConnectGateShell` and `.linear-connect-gate*` rules in `src/index.css`.
 * Progress steps: `connectGateProgressConfig.ts` (shared with the React app).
 */

import {
  CONNECT_GATE_PROGRESS_STEPS,
  connectGateStepComplete,
  type ConnectGateProgressState,
} from "./connectGateProgressConfig.ts";

export type ConnectGatePageVariant = "neutral" | "error";

const CONNECT_GATE_THEME_VARS = `
  :root {
    color-scheme: dark light;
    --bg-app: #070707;
    --bg-panel: #0f0f10;
    --border-subtle: #171819;
    --border-muted: #171819;
    --text-primary: #e4e4e7;
    --text-muted: #9aa0a6;
    --error-text: #ffb4b4;
    --btn-primary-bg: #ececec;
    --btn-primary-text: #111214;
    --backster-logo-gradient: #ffffff;
    --backster-logo-solid: #000000;
    --linear-logo-primary: #f7f8f8;
    --settings-connection-badge-bg: color-mix(in srgb, #4ade80 10%, transparent);
    --settings-connection-badge-border: color-mix(in srgb, #4ade80 34%, transparent);
    --settings-connection-badge-text: #86efac;
    --settings-connection-dot: #4ade80;
  }
  @media (prefers-color-scheme: light) {
    :root {
      color-scheme: light;
      --bg-app: #f5f5f7;
      --bg-panel: #ffffff;
      --border-subtle: #e5e5ea;
      --border-muted: #ebebf0;
      --text-primary: #1d1d1f;
      --text-muted: #636366;
      --error-text: #c62828;
      --btn-primary-bg: #1d1d1f;
      --btn-primary-text: #ffffff;
      --backster-logo-gradient: #000000;
      --backster-logo-solid: #ffffff;
      --linear-logo-primary: #222326;
      --settings-connection-badge-bg: #dcfce7;
      --settings-connection-badge-border: #86efac;
      --settings-connection-badge-text: #166534;
      --settings-connection-dot: #15803d;
    }
  }
`;

const LINEAR_LOGO_PATH =
  "M1.17156 9.61319C1.14041 9.4804 1.2986 9.39676 1.39505 9.49321L6.50679 14.6049C6.60323 14.7014 6.5196 14.8596 6.38681 14.8284C3.80721 14.2233 1.77669 12.1928 1.17156 9.61319ZM1.00026 7.56447C0.997795 7.60413 1.01271 7.64286 1.0408 7.67096L8.32904 14.9592C8.35714 14.9873 8.39586 15.0022 8.43553 14.9997C8.76721 14.9791 9.09266 14.9353 9.41026 14.8701C9.51729 14.8481 9.55448 14.7166 9.47721 14.6394L1.36063 6.52279C1.28337 6.44552 1.15187 6.48271 1.12989 6.58974C1.06466 6.90734 1.02092 7.23278 1.00026 7.56447ZM1.58953 5.15875C1.56622 5.21109 1.57809 5.27224 1.6186 5.31275L10.6872 14.3814C10.7278 14.4219 10.7889 14.4338 10.8412 14.4105C11.0913 14.2991 11.3336 14.1735 11.5672 14.0347C11.6445 13.9888 11.6564 13.8826 11.5929 13.819L2.18099 4.40714C2.11742 4.34356 2.01121 4.35549 1.96529 4.43278C1.8265 4.66636 1.70091 4.9087 1.58953 5.15875ZM2.77222 3.53036C2.7204 3.47854 2.7172 3.39544 2.76602 3.34079C4.04913 1.9043 5.9156 1 7.99327 1C11.863 1 15 4.13702 15 8.00673C15 10.0844 14.0957 11.9509 12.6592 13.234C12.6046 13.2828 12.5215 13.2796 12.4696 13.2278L2.77222 3.53036Z";

const INTEGRATION_LOGO_SIZE = 48;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeHtmlAttribute(text: string): string {
  return escapeHtml(text).replace(/`/g, "&#96;");
}

function backsterMarkSvg(size = 56): string {
  return `<svg class="linear-connect-gate-logo" width="${size}" height="${size}" viewBox="0 0 113 118" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g clip-path="url(#backster-connect-gate-clip)"><rect x="72.8337" y="29.4073" width="65.289" height="65.289" rx="15" transform="rotate(45 72.8337 29.4073)" fill="url(#backster-connect-gate-p0)"/><rect x="40.1663" y="89.0464" width="65.289" height="65.289" rx="15" transform="rotate(-135 40.1663 89.0464)" fill="url(#backster-connect-gate-p1)"/><rect x="92.5219" y="66.4581" width="65.289" height="65.289" rx="15" transform="rotate(120 92.5219 66.4581)" fill="url(#backster-connect-gate-p2)"/><rect x="26.7189" y="51.3057" width="65.289" height="65.289" rx="15" transform="rotate(-60 26.7189 51.3057)" fill="url(#backster-connect-gate-p3)"/><rect x="45.8871" y="45.9196" width="25.578" height="24.4153" rx="12.2077" fill="var(--backster-logo-solid)"/></g><defs><linearGradient id="backster-connect-gate-p0" x1="105.478" y1="29.4073" x2="105.478" y2="94.6964" gradientUnits="userSpaceOnUse"><stop stop-color="var(--backster-logo-gradient)"/><stop offset="1" stop-color="var(--backster-logo-gradient)" stop-opacity="0"/></linearGradient><linearGradient id="backster-connect-gate-p1" x1="72.8108" y1="89.0464" x2="72.8108" y2="154.335" gradientUnits="userSpaceOnUse"><stop stop-color="var(--backster-logo-gradient)"/><stop offset="1" stop-color="var(--backster-logo-gradient)" stop-opacity="0"/></linearGradient><linearGradient id="backster-connect-gate-p2" x1="125.166" y1="66.4581" x2="125.166" y2="131.747" gradientUnits="userSpaceOnUse"><stop stop-color="var(--backster-logo-gradient)"/><stop offset="1" stop-color="var(--backster-logo-gradient)" stop-opacity="0"/></linearGradient><linearGradient id="backster-connect-gate-p3" x1="59.3634" y1="51.3057" x2="59.3634" y2="116.595" gradientUnits="userSpaceOnUse"><stop stop-color="var(--backster-logo-gradient)"/><stop offset="1" stop-color="var(--backster-logo-gradient)" stop-opacity="0"/></linearGradient><clipPath id="backster-connect-gate-clip"><rect width="113" height="118" rx="22" fill="white"/></clipPath></defs></svg>`;
}

function linearMarkSvg(size = INTEGRATION_LOGO_SIZE): string {
  return `<svg class="linear-connect-gate-logo linear-connect-gate-logo-linear" width="${size}" height="${size}" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="${LINEAR_LOGO_PATH}" fill="var(--linear-logo-primary)"/></svg>`;
}

function brandArrowSvg(): string {
  return `<span class="linear-connect-gate-brand-arrow" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7 5l5 5-5 5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
}

function integrationBrandHtml(
  size = INTEGRATION_LOGO_SIZE,
  linearConnected = false,
): string {
  const pendingClass = linearConnected
    ? ""
    : " linear-connect-gate-brand--integration-pending";
  return `<div class="linear-connect-gate-brand linear-connect-gate-brand--integration${pendingClass}" aria-hidden="true">${backsterMarkSvg(size)}${brandArrowSvg()}${linearMarkSvg(size)}</div>`;
}

function buildConnectGateStepCompleteIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M6 0a6 6 0 1 1 0 12A6 6 0 0 1 6 0Zm-.705 8.737L9.63 4.403 8.392 3.166 5.295 6.263l-1.7-1.702L2.356 5.8l2.938 2.938Z"></path></svg>`;
}

function buildConnectGateStepCircleIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="5.5" fill="none" stroke="currentColor" stroke-width="1"></circle></svg>`;
}

function buildConnectGateProgressHtml(progress: ConnectGateProgressState): string {
  const items = CONNECT_GATE_PROGRESS_STEPS
    .map((step) => {
      const complete = connectGateStepComplete(step.id, progress);
      const isActive = step.id === progress.activeStep;
      const stepClassName = [
        "connect-gate-progress-step",
        complete && "connect-gate-progress-step--complete",
        isActive && "connect-gate-progress-step--current",
        isActive && !complete && "connect-gate-progress-step--active",
      ]
        .filter(Boolean)
        .join(" ");
      const icon = complete
        ? buildConnectGateStepCompleteIcon()
        : buildConnectGateStepCircleIcon();
      return `<li class="connect-gate-progress-item"><span class="${stepClassName}"><span class="connect-gate-progress-step-icon">${icon}</span><span class="connect-gate-progress-step-label">${escapeHtml(step.label)}</span></span></li>`;
    })
    .join("");

  return `<nav class="connect-gate-progress" aria-label="Setup progress"><ol class="connect-gate-progress-list">${items}</ol></nav>`;
}

const CONNECT_GATE_PAGE_CSS = `
  ${CONNECT_GATE_THEME_VARS}
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    min-height: 100%;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  .app-shell.linear-connect-gate {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: var(--bg-app);
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }
  .linear-connect-gate-stack {
    width: 100%;
    max-width: 36rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .connect-gate-progress {
    width: 100%;
  }
  .connect-gate-progress-list {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .connect-gate-progress-item {
    display: flex;
    align-items: center;
  }
  .connect-gate-progress-step {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0;
    border: none;
    background: none;
    color: var(--text-muted);
    font-size: 0.8125rem;
    font-weight: 500;
    line-height: 1.2;
    white-space: nowrap;
  }
  .connect-gate-progress-step--active {
    color: var(--text-primary);
    font-weight: 600;
  }
  .connect-gate-progress-step--current {
    border-radius: 6px;
    padding: 0.25rem 0.5rem;
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--border-muted) 85%, var(--text-muted));
  }
  .connect-gate-progress-step--complete {
    color: var(--text-primary);
  }
  .connect-gate-progress-step-icon {
    display: inline-flex;
    flex-shrink: 0;
    line-height: 0;
    color: currentColor;
  }
  .connect-gate-progress-step--complete .connect-gate-progress-step-icon {
    color: var(--settings-connection-dot);
  }
  .connect-gate-progress-step--complete .connect-gate-progress-step-icon svg path {
    fill: currentColor;
  }
  .connect-gate-progress-step-label {
    letter-spacing: 0.01em;
  }
  .linear-connect-gate-card {
    width: 100%;
    max-width: 36rem;
    padding: 1.5rem;
    border: 1px solid var(--border-subtle);
    border-radius: 12px;
    background: var(--bg-panel);
  }
  .linear-connect-gate-card--centered {
    text-align: center;
  }
  .linear-connect-gate-brand {
    display: flex;
    justify-content: center;
    margin-bottom: 1.25rem;
  }
  .linear-connect-gate-brand--integration {
    align-items: center;
    gap: 1rem;
  }
  .linear-connect-gate-brand--integration-pending .linear-connect-gate-logo-linear {
    opacity: 0.32;
    animation: linear-connect-gate-linear-pending-pulse 2s ease-in-out infinite;
  }
  @keyframes linear-connect-gate-linear-pending-pulse {
    0%, 100% { opacity: 0.28; }
    50% { opacity: 0.55; }
  }
  .linear-connect-gate-brand-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    line-height: 0;
    color: var(--text-muted);
  }
  .linear-connect-gate-logo {
    display: block;
  }
  .linear-connect-gate-header {
    margin-bottom: 1rem;
  }
  .linear-connect-gate-card--centered .linear-connect-gate-header {
    margin-bottom: 1.25rem;
  }
  .linear-connect-gate-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  .linear-connect-gate-description {
    margin: 0.5rem 0 0;
    color: var(--text-muted);
    line-height: 1.5;
  }
  .linear-connect-gate-description--error {
    color: var(--error-text);
  }
  .linear-connect-gate-actions {
    display: flex;
    justify-content: center;
    margin-top: 0.25rem;
  }
  .linear-connect-gate-primary {
    min-width: 12rem;
  }
  .btn-primary {
    border: none;
    border-radius: 10px;
    padding: 8px 12px;
    background: var(--btn-primary-bg);
    color: var(--btn-primary-text);
    font: inherit;
    font-weight: 500;
    text-decoration: none;
    display: inline-block;
    cursor: pointer;
  }
  .btn-primary:disabled {
    opacity: 1;
    cursor: default;
  }
`;

function buildSuccessActionsHtml(dashboardUrl: string, actionLabel = "Continue..."): string {
  const safeUrl = escapeHtmlAttribute(dashboardUrl);
  const safeLabel = escapeHtml(actionLabel);
  return `<div class="linear-connect-gate-actions">
    <a class="btn-primary linear-connect-gate-primary" href="${safeUrl}">${safeLabel}</a>
  </div>`;
}

export function buildConnectGatePageHtml(input: {
  title: string;
  description: string;
  variant?: ConnectGatePageVariant;
  /** Optional primary-style action (e.g. disabled success button). */
  primaryActionLabel?: string;
  /** OAuth success: primary link back to the app. */
  successDashboardUrl?: string;
  /** Label for the success dashboard link (default: Continue...). */
  successDashboardLabel?: string;
  /** Setup steps shown above the card (Linear, Cursor Agent, Setup). */
  progress?: ConnectGateProgressState;
}): string {
  const variant = input.variant ?? "neutral";
  const title = escapeHtml(input.title);
  const description = escapeHtml(input.description);
  const descriptionClass =
    variant === "error"
      ? "linear-connect-gate-description linear-connect-gate-description--error"
      : "linear-connect-gate-description";

  const linearConnected = input.progress?.linearComplete ?? false;
  const progressHtml = input.progress ? buildConnectGateProgressHtml(input.progress) : "";

  let actionHtml = "";
  if (input.successDashboardUrl) {
    actionHtml = buildSuccessActionsHtml(
      input.successDashboardUrl,
      input.successDashboardLabel ?? "Continue...",
    );
  } else if (input.primaryActionLabel) {
    actionHtml = `<div class="linear-connect-gate-actions"><button type="button" class="btn-primary linear-connect-gate-primary" disabled>${escapeHtml(input.primaryActionLabel)}</button></div>`;
  }

  const cardHtml = `<div class="linear-connect-gate-card linear-connect-gate-card--centered">
      ${integrationBrandHtml(INTEGRATION_LOGO_SIZE, linearConnected)}
      <header class="linear-connect-gate-header">
        <h1 class="linear-connect-gate-title">${title}</h1>
        <p class="${descriptionClass}">${description}</p>
      </header>
      ${actionHtml}
    </div>`;

  const stackHtml = progressHtml
    ? `<div class="linear-connect-gate-stack">${progressHtml}${cardHtml}</div>`
    : cardHtml;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} · BacksterOS</title>
  <style>${CONNECT_GATE_PAGE_CSS}</style>
</head>
<body>
  <div class="app-shell linear-connect-gate">
    ${stackHtml}
  </div>
</body>
</html>`;
}
