import type { ReactNode } from "react";
import { ConnectGateBrand, type ConnectGateBrandVariant } from "./ConnectGateBrand";
import {
  ConnectGateProgress,
  type ConnectGateProgressStep,
} from "./ConnectGateProgress";

/** In-app connect gate — layout matches `sidecar/src/connectGatePageHtml.ts` OAuth pages. */

export function ConnectGateShell({
  title,
  description,
  children,
  className,
  brand = "backster",
  integrationConnected = false,
  progressStep,
  linearStepComplete = false,
  cursorStepComplete = false,
  onProgressStepClick,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  brand?: ConnectGateBrandVariant;
  integrationConnected?: boolean;
  progressStep?: ConnectGateProgressStep;
  linearStepComplete?: boolean;
  cursorStepComplete?: boolean;
  onProgressStepClick?: (step: ConnectGateProgressStep) => void;
}) {
  return (
    <div
      className={["app-shell linear-connect-gate", className].filter(Boolean).join(" ")}
    >
      <div className="linear-connect-gate-stack">
        {progressStep ? (
          <ConnectGateProgress
            activeStep={progressStep}
            linearComplete={linearStepComplete}
            cursorComplete={cursorStepComplete}
            onStepClick={onProgressStepClick}
          />
        ) : null}
        <div className="linear-connect-gate-card linear-connect-gate-card--centered">
          <ConnectGateBrand variant={brand} integrationConnected={integrationConnected} />
          <header className="linear-connect-gate-header">
            <h1 className="linear-connect-gate-title">{title}</h1>
            {description ? (
              <p className="linear-connect-gate-description">{description}</p>
            ) : null}
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
