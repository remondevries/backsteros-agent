export type OrganizationsContentMode = "organizations" | "customers";

export function OrganizationsContentModeToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: OrganizationsContentMode;
  onChange: (mode: OrganizationsContentMode) => void;
  disabled?: boolean;
}) {
  const activeIndex = mode === "organizations" ? 0 : 1;

  return (
    <div
      className="model-mode-toggle organizations-content-toggle"
      role="group"
      aria-label="Organizations view"
      data-mode={mode}
      data-active-index={activeIndex}
    >
      <span className="model-mode-indicator" aria-hidden="true" />
      <button
        type="button"
        className={`model-mode-option ${mode === "organizations" ? "active" : ""}`}
        onClick={() => onChange("organizations")}
        disabled={disabled}
        aria-pressed={mode === "organizations"}
      >
        Organizations
      </button>
      <button
        type="button"
        className={`model-mode-option ${mode === "customers" ? "active" : ""}`}
        onClick={() => onChange("customers")}
        disabled={disabled}
        aria-pressed={mode === "customers"}
      >
        Customers
      </button>
    </div>
  );
}
