import type { ReactNode } from "react";

export function SettingsPickerBadge({ children }: { children: ReactNode }) {
  return <span className="settings-option-picker-option-badge">{children}</span>;
}

export function SettingsPickerOptionRow({
  label,
  badge,
}: {
  label: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <span className="settings-option-picker-option-main">
      <span className="linear-project-picker-option-name">{label}</span>
      {badge ? <SettingsPickerBadge>{badge}</SettingsPickerBadge> : null}
    </span>
  );
}
