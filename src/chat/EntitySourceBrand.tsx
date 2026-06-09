import type { ReactNode } from "react";

export function EntitySourceBrand({
  icon,
  label,
  uppercase = true,
}: {
  icon: ReactNode;
  label: string;
  uppercase?: boolean;
}) {
  return (
    <div className="entity-source-brand">
      <div className="entity-source-brand-row">
        <span className="entity-source-brand-icon">{icon}</span>
        <span
          className={
            uppercase ? "entity-source-brand-title" : "entity-source-brand-title-sentence"
          }
        >
          {label}
        </span>
      </div>
    </div>
  );
}
