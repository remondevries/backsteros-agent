import type { ReactNode } from "react";

export function AppDashboardShell({
  icon,
  title,
  subtitle,
  loading,
  refreshing,
  onRefresh,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="app-dashboard">
      <div className="app-dashboard-inner">
        <header className="app-dashboard-header">
          <div className="app-dashboard-title-row">
            {icon}
            <div>
              <h1 className="app-dashboard-title">{title}</h1>
              {subtitle && <p className="app-dashboard-subtitle">{subtitle}</p>}
            </div>
          </div>
          {onRefresh && (
            <button
              type="button"
              className="app-dashboard-refresh"
              disabled={loading || refreshing}
              onClick={onRefresh}
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          )}
        </header>
        {children}
      </div>
    </div>
  );
}
