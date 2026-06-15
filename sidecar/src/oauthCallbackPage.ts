import type { ConnectGatePageVariant } from "./connectGatePageHtml.ts";
import { buildConnectGatePageHtml } from "./connectGatePageHtml.ts";
import { resolveAppReturnUrl } from "./config.ts";
import type { ConnectGateProgressState } from "./connectGateProgressConfig.ts";

export type OAuthCallbackPageVariant = "success" | "error" | "neutral";

export type { ConnectGateProgressState };

export function buildOAuthCallbackPageHtml(input: {
  title: string;
  message: string;
  variant?: OAuthCallbackPageVariant;
  appReturnUrl?: string;
  successDashboardUrl?: string;
  successDashboardLabel?: string;
  connectProgress?: ConnectGateProgressState;
}): string {
  const variant: ConnectGatePageVariant = input.variant === "error" ? "error" : "neutral";

  return buildConnectGatePageHtml({
    title: input.title,
    description: input.message,
    variant,
    progress: input.connectProgress,
    successDashboardUrl:
      input.variant === "success"
        ? (input.successDashboardUrl ?? resolveAppReturnUrl(input.appReturnUrl))
        : undefined,
    successDashboardLabel: input.successDashboardLabel,
  });
}
