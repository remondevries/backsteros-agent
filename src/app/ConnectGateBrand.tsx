import { BacksterIcon } from "../chat/BacksterIcon";
import { CursorIcon } from "../chat/CursorIcon";
import { LinearIcon } from "../chat/LinearIcon";

const INTEGRATION_LOGO_SIZE = 48;

export type ConnectGateBrandVariant = "backster" | "backster-linear" | "backster-cursor";

export function ConnectGateBrand({
  variant = "backster",
  integrationConnected = false,
}: {
  variant?: ConnectGateBrandVariant;
  /** When false, the partner integration logo is muted (pre-connect / waiting). */
  integrationConnected?: boolean;
}) {
  if (variant === "backster") {
    return (
      <div className="linear-connect-gate-brand" aria-hidden="true">
        <BacksterIcon size={56} className="linear-connect-gate-logo" />
      </div>
    );
  }

  const integrationPending = !integrationConnected;
  const PartnerIcon = variant === "backster-linear" ? LinearIcon : CursorIcon;
  const partnerLogoClass =
    variant === "backster-linear"
      ? "linear-connect-gate-logo-linear"
      : "linear-connect-gate-logo-cursor";

  return (
    <div
      className={[
        "linear-connect-gate-brand linear-connect-gate-brand--integration",
        integrationPending && "linear-connect-gate-brand--integration-pending",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <BacksterIcon size={INTEGRATION_LOGO_SIZE} className="linear-connect-gate-logo" />
      <span className="linear-connect-gate-brand-arrow" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M7 5l5 5-5 5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <PartnerIcon
        size={INTEGRATION_LOGO_SIZE}
        className={`linear-connect-gate-logo ${partnerLogoClass}`}
      />
    </div>
  );
}
