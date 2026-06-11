import type { ToolPinSelection, ToolSelection } from "./tool-routing";
import { CalendarIcon } from "./CalendarIcon";
import { LinearIcon } from "./LinearIcon";
import { ObsidianIcon } from "./ObsidianIcon";
import { WhoopIcon } from "./WhoopIcon";

const TOOL_CONFIG: Array<{
  key: keyof ToolSelection;
  label: string;
  title: string;
  className?: string;
  Icon: typeof ObsidianIcon;
}> = [
  {
    key: "obsidian",
    label: "Notes",
    title: "Obsidian notes tools",
    Icon: ObsidianIcon,
  },
  {
    key: "linear",
    label: "Linear",
    title: "Linear",
    className: "composer-tool-indicator-linear",
    Icon: LinearIcon,
  },
  {
    key: "calendar",
    label: "Calendar",
    title: "Google Calendar",
    className: "composer-tool-indicator-calendar",
    Icon: CalendarIcon,
  },
  {
    key: "whoop",
    label: "Whoop",
    title: "Whoop",
    className: "composer-tool-indicator-whoop",
    Icon: WhoopIcon,
  },
];

export function ComposerToolIndicators({
  tools,
  pins,
  onDismiss,
}: {
  tools: ToolSelection;
  pins?: ToolPinSelection;
  onDismiss?: (tool: keyof ToolSelection) => void;
}) {
  const visibleTools = TOOL_CONFIG.filter(({ key }) => {
    const pin = pins?.[key] ?? "auto";
    return tools[key] || pin === "on";
  });

  if (visibleTools.length === 0) {
    return null;
  }

  return (
    <div className="composer-tool-indicators" aria-label="Tools for this message">
      {visibleTools.map(({ key, label, title, className, Icon }) => {
        const active = tools[key];
        const pin = pins?.[key] ?? "auto";
        const indicatorClass = [
          "composer-tool-indicator",
          className,
          active ? "composer-tool-indicator-active" : "",
          pin === "on" ? "composer-tool-indicator-pinned-on" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <button
            key={key}
            type="button"
            className={indicatorClass}
            title={`Remove ${title}`}
            aria-label={`Remove ${label}`}
            onClick={() => onDismiss?.(key)}
          >
            <Icon className="composer-tool-indicator-icon" size={14} aria-hidden="true" />
            <span className="composer-tool-indicator-dismiss" aria-hidden="true">
              ×
            </span>
          </button>
        );
      })}
    </div>
  );
}
