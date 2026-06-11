import { SettingsConnectionDot } from "./SettingsConnectionDot";

export function SettingsConnectionBadge() {
  return (
    <span className="settings-connection-badge" role="status">
      <SettingsConnectionDot className="settings-connection-badge-dot" />
      Connected
    </span>
  );
}
