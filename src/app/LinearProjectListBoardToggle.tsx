export type LinearProjectCollectionMode = "list" | "board";
export type LinearProjectCollectionToggleOption = {
  mode: LinearProjectCollectionMode;
  label: string;
};

const DEFAULT_TOGGLE_OPTIONS: readonly LinearProjectCollectionToggleOption[] = [
  { mode: "list", label: "List" },
  { mode: "board", label: "Board" },
] as const;

export function LinearProjectListBoardToggle({
  mode,
  onChange,
  options = DEFAULT_TOGGLE_OPTIONS,
  ariaLabel = "Issue view mode",
  neutral = false,
}: {
  mode: LinearProjectCollectionMode;
  onChange: (mode: LinearProjectCollectionMode) => void;
  options?: readonly LinearProjectCollectionToggleOption[];
  ariaLabel?: string;
  neutral?: boolean;
}) {
  const normalizedOptions =
    options.length === 2
      ? options
      : DEFAULT_TOGGLE_OPTIONS;
  const activeIndex = neutral ? -1 : normalizedOptions[0]?.mode === mode ? 0 : 1;

  return (
    <div
      className="model-mode-toggle linear-project-list-board-toggle"
      role="group"
      aria-label={ariaLabel}
      data-active-index={activeIndex}
    >
      <span className="model-mode-indicator" aria-hidden="true" />
      {normalizedOptions.map((option) => {
        const active = !neutral && mode === option.mode;
        return (
          <button
            key={option.mode}
            type="button"
            className={`model-mode-option ${active ? "active" : ""}`}
            onClick={() => onChange(option.mode)}
            aria-pressed={active}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
