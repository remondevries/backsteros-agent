import type { SlashCommandDefinition } from "./slashCommands";
import { formatSlashCommandTriggerHint } from "./slashCommands";

export function SlashCommandMenu({
  commands,
  selectedIndex,
  onSelect,
  onHover,
}: {
  commands: SlashCommandDefinition[];
  selectedIndex: number;
  onSelect: (command: SlashCommandDefinition) => void;
  onHover: (index: number) => void;
}) {
  return (
    <div className="composer-slash-command-menu" role="listbox" aria-label="Slash commands">
      <div className="composer-slash-command-menu-header">Commands</div>
      <ul className="composer-slash-command-menu-list">
        {commands.map((command, index) => {
          const isActive = index === selectedIndex;
          return (
            <li key={command.id}>
              <button
                type="button"
                role="option"
                aria-selected={isActive}
                className={[
                  "composer-slash-command-item",
                  isActive ? "composer-slash-command-item-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => onSelect(command)}
                onMouseEnter={() => onHover(index)}
              >
                <span className="composer-slash-command-item-main">
                  <span className="composer-slash-command-item-label">{command.label}</span>
                  <span className="composer-slash-command-item-description">
                    {command.description}
                  </span>
                </span>
                <span className="composer-slash-command-item-trigger">
                  {formatSlashCommandTriggerHint(command)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="composer-slash-command-menu-footer">
        <span>↑↓ navigate</span>
        <span>↵ select</span>
      </div>
    </div>
  );
}
