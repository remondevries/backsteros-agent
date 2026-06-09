import { useState } from "react";
import type { ToolPinSelection, ToolSelection, ToolToggleState } from "./tool-routing";
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

function pinLabel(pin: ToolToggleState | undefined): string {
  if (pin === "on") return "Pinned on";
  if (pin === "off") return "Pinned off";
  return "Auto";
}

function isToolPinned(pin: ToolToggleState | undefined): boolean {
  return pin === "on" || pin === "off";
}

export function ComposerToolIndicators({
  tools,
  pins,
  onTogglePin,
}: {
  tools: ToolSelection;
  pins?: ToolPinSelection;
  onTogglePin?: (tool: keyof ToolSelection) => void;
}) {
  const [showAllTools, setShowAllTools] = useState(false);
  const interactive = Boolean(onTogglePin);

  const hiddenAutoTools = TOOL_CONFIG.filter(({ key }) => {
    const pin = pins?.[key] ?? "auto";
    return !tools[key] && !isToolPinned(pin);
  });

  const visibleTools = TOOL_CONFIG.filter(({ key }) => {
    const pin = pins?.[key] ?? "auto";
    return tools[key] || isToolPinned(pin) || (showAllTools && !tools[key] && pin === "auto");
  });

  if (visibleTools.length === 0 && !interactive) {
    return null;
  }

  return (
    <div className="composer-tool-indicators" aria-label="Tools for this message">
      {visibleTools.map(({ key, label, title, className, Icon }) => {
        const active = tools[key];
        const pin = pins?.[key] ?? "auto";
        const isIdlePicker = showAllTools && !active && pin === "auto";
        const indicatorClass = [
          "composer-tool-indicator",
          className,
          active ? "composer-tool-indicator-active" : "",
          isIdlePicker ? "composer-tool-indicator-idle" : "",
          pin === "on" ? "composer-tool-indicator-pinned-on" : "",
          pin === "off" ? "composer-tool-indicator-pinned-off" : "",
        ]
          .filter(Boolean)
          .join(" ");

        if (interactive && onTogglePin) {
          return (
            <button
              key={key}
              type="button"
              className={indicatorClass}
              title={`${title} — ${pinLabel(pin)}. Click to cycle auto, on, off.`}
              aria-label={`${label}: ${pinLabel(pin)}`}
              aria-pressed={pin === "on" ? true : pin === "off" ? false : undefined}
              onClick={() => onTogglePin(key)}
            >
              <Icon className="composer-tool-indicator-icon" size={14} />
            </button>
          );
        }

        return (
          <span key={key} className={indicatorClass} title={label}>
            <Icon className="composer-tool-indicator-icon" size={14} />
          </span>
        );
      })}

      {interactive && hiddenAutoTools.length > 0 && !showAllTools && (
        <button
          type="button"
          className="composer-tool-add"
          title="Choose additional tools for this message"
          aria-label="Add tools"
          onClick={() => setShowAllTools(true)}
        >
          +
        </button>
      )}

      {interactive && showAllTools && hiddenAutoTools.length > 0 && (
        <button
          type="button"
          className="composer-tool-add composer-tool-add-done"
          title="Hide unused tools"
          aria-label="Hide unused tools"
          onClick={() => setShowAllTools(false)}
        >
          Done
        </button>
      )}
    </div>
  );
}
