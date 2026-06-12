import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  searchableDropdownShortcut,
  searchableDropdownShortcutIndex,
} from "./searchableDropdownShortcuts";

const DEFAULT_PANEL_WIDTH = 280;
const PANEL_GAP = 6;
const VIEWPORT_PADDING = 8;

export type SearchableDropdownOption<T extends string = string> = {
  value: T;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  searchTerms?: string;
};

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function filterOptions<T extends string>(
  options: SearchableDropdownOption<T>[],
  query: string,
): SearchableDropdownOption<T>[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return options;

  return options.filter((option) => {
    const haystack = `${option.label} ${option.searchTerms ?? ""}`.trim().toLowerCase();
    return haystack.includes(normalized);
  });
}

export function SearchableDropdown<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
  searchPlaceholder = "Search…",
  searchShortcutLabel,
  ariaLabel,
  className,
  triggerClassName,
  panelWidth = DEFAULT_PANEL_WIDTH,
  panelAlign = "start",
  renderTrigger,
}: {
  value: T | null;
  options: SearchableDropdownOption<T>[];
  onChange?: (value: T) => void;
  disabled?: boolean;
  searchPlaceholder?: string;
  /** Badge shown in the search header (e.g. "S" to focus search). */
  searchShortcutLabel?: string;
  ariaLabel: string;
  className?: string;
  triggerClassName?: string;
  panelWidth?: number;
  panelAlign?: "start" | "end";
  renderTrigger?: (props: {
    selected: SearchableDropdownOption<T> | null;
    open: boolean;
    disabled: boolean;
    triggerId: string;
    onToggle: () => void;
  }) => ReactNode;
}) {
  const fallbackId = useId();
  const triggerId = `searchable-dropdown-${fallbackId}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  const filteredOptions = useMemo(() => filterOptions(options, query), [options, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const selectOption = useCallback(
    (option: SearchableDropdownOption<T>) => {
      onChange?.(option.value);
      close();
    },
    [close, onChange],
  );

  const openMenu = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setQuery("");
    setActiveIndex(0);
  }, [disabled]);

  const toggleMenu = useCallback(() => {
    if (disabled) return;
    if (open) {
      close();
      return;
    }
    openMenu();
  }, [close, disabled, open, openMenu]);

  const updatePanelPosition = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;

    const trigger = root.querySelector("button");
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = panelWidth;
    const maxLeft = window.innerWidth - width - VIEWPORT_PADDING;
    let left =
      panelAlign === "end" ? rect.right - width : rect.left;
    left = Math.max(VIEWPORT_PADDING, Math.min(left, maxLeft));

    const panelHeight = panelRef.current?.offsetHeight ?? 320;
    const spaceBelow = window.innerHeight - rect.bottom - PANEL_GAP - VIEWPORT_PADDING;
    const openUpward = spaceBelow < panelHeight && rect.top > panelHeight + PANEL_GAP;
    const top = openUpward
      ? Math.max(VIEWPORT_PADDING, rect.top - panelHeight - PANEL_GAP)
      : rect.bottom + PANEL_GAP;

    setPanelStyle({
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
    });
  }, [panelAlign, panelWidth]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
    const frame = window.requestAnimationFrame(() => {
      updatePanelPosition();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, filteredOptions.length, query, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;

    function handleReposition() {
      updatePanelPosition();
    }

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      searchRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      close();
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [close, open]);

  useEffect(() => {
    if (activeIndex >= filteredOptions.length) {
      setActiveIndex(Math.max(0, filteredOptions.length - 1));
    }
  }, [activeIndex, filteredOptions.length]);

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, filteredOptions.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const option = filteredOptions[activeIndex];
      if (option) selectOption(option);
      return;
    }

    const shortcutIndex = searchableDropdownShortcutIndex(event.key);
    if (shortcutIndex != null && shortcutIndex < filteredOptions.length) {
      event.preventDefault();
      selectOption(filteredOptions[shortcutIndex]!);
    }
  }

  const defaultTrigger = (
    <button
      type="button"
      id={triggerId}
      className={[
        "searchable-dropdown-trigger",
        triggerClassName,
        open ? "searchable-dropdown-trigger--open" : null,
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label={ariaLabel}
      onClick={toggleMenu}
    >
      {selected?.icon ? (
        <span className="searchable-dropdown-trigger-icon" aria-hidden="true">
          {selected.icon}
        </span>
      ) : null}
      <span className="searchable-dropdown-trigger-label">{selected?.label ?? "Select…"}</span>
    </button>
  );

  return (
    <div
      ref={rootRef}
      className={["searchable-dropdown", open ? "searchable-dropdown--open" : null, className]
        .filter(Boolean)
        .join(" ")}
    >
      {renderTrigger
        ? renderTrigger({
            selected,
            open,
            disabled,
            triggerId,
            onToggle: toggleMenu,
          })
        : defaultTrigger}

      {open
        ? createPortal(
            <div
              ref={panelRef}
              className="searchable-dropdown-panel searchable-dropdown-panel--floating"
              style={panelStyle}
              role="presentation"
            >
              <div className="searchable-dropdown-search-row">
                <input
                  ref={searchRef}
                  type="search"
                  className="searchable-dropdown-search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  autoComplete="off"
                  spellCheck={false}
                />
                {searchShortcutLabel ? (
                  <span className="searchable-dropdown-search-shortcut" aria-hidden="true">
                    {searchShortcutLabel}
                  </span>
                ) : null}
              </div>

              <ul className="searchable-dropdown-list" role="listbox" aria-labelledby={triggerId}>
                {filteredOptions.length === 0 ? (
                  <li className="searchable-dropdown-empty" role="presentation">
                    No matches
                  </li>
                ) : (
                  filteredOptions.map((option, index) => {
                    const isSelected = option.value === value;
                    const isActive = index === activeIndex;
                    const shortcut = option.shortcut ?? searchableDropdownShortcut(index);

                    return (
                      <li key={option.value} role="presentation">
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className={[
                            "searchable-dropdown-option",
                            isSelected ? "searchable-dropdown-option--selected" : null,
                            isActive ? "searchable-dropdown-option--active" : null,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => selectOption(option)}
                        >
                          <span className="searchable-dropdown-option-leading">
                            {option.icon ? (
                              <span className="searchable-dropdown-option-icon" aria-hidden="true">
                                {option.icon}
                              </span>
                            ) : null}
                            <span className="searchable-dropdown-option-label">{option.label}</span>
                          </span>
                          <span className="searchable-dropdown-option-trailing">
                            {isSelected ? (
                              <span className="searchable-dropdown-option-check" aria-hidden="true">
                                <CheckIcon />
                              </span>
                            ) : null}
                            {shortcut ? (
                              <span className="searchable-dropdown-option-shortcut" aria-hidden="true">
                                {shortcut}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
