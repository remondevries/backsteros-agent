import { useCallback, useEffect, useRef, useState } from "react";
import {
  APP_VIEWS,
  buildGoToKeyHint,
  findAppViewByLetter,
  getAppViewIndex,
  type AppView,
  type AppViewDefinition,
} from "./appViews";
import { SlidingListHighlight } from "./SlidingListHighlight";
import { useSlidingRowHighlight } from "../hooks/useSlidingRowHighlight";

function CommandPanelItem({
  view,
  isActive,
  buttonRef,
  onSelect,
  onHover,
}: {
  view: AppViewDefinition;
  isActive: boolean;
  buttonRef?: (element: HTMLButtonElement | null) => void;
  onSelect: (view: AppView) => void;
  onHover: () => void;
}) {
  const itemClass = [
    "command-panel-item",
    view.lead ? "command-panel-item-lead" : null,
    isActive ? "command-panel-item-active" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={buttonRef}
      type="button"
      className={itemClass}
      onClick={() => onSelect(view.id)}
      onMouseEnter={onHover}
    >
      <span className="command-panel-item-icon">{view.icon}</span>
      <span className="command-panel-item-label">{view.label}</span>
      <span className="command-panel-item-shortcut">{buildGoToKeyHint(view)}</span>
    </button>
  );
}

export function CommandPanel({
  activeView,
  onClose,
  onSelect,
}: {
  activeView: AppView;
  onClose: () => void;
  onSelect: (view: AppView) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(() => Math.max(0, getAppViewIndex(activeView)));
  const listNavArmedRef = useRef(false);
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const getBorderRadius = useCallback(
    (item: HTMLButtonElement | null) =>
      item?.classList.contains("command-panel-item-lead") ? "4px" : "6px",
    [],
  );

  const { listRef, setItemRef, highlightRect, highlightReady } = useSlidingRowHighlight(
    selectedIndex,
    { getBorderRadius },
  );

  useEffect(() => {
    listRef.current?.focus();
  }, [listRef]);

  useEffect(() => {
    listNavArmedRef.current = false;
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const targetCount = APP_VIEWS.length;

      if (key === "escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (key === "enter") {
        const active = APP_VIEWS[selectedIndexRef.current] ?? APP_VIEWS[0];
        if (active) {
          event.preventDefault();
          event.stopPropagation();
          onSelectRef.current(active.id);
          onCloseRef.current();
        }
        return;
      }

      if (key === "j" || key === "arrowdown") {
        listNavArmedRef.current = true;
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex((index) => Math.min(index + 1, targetCount - 1));
        return;
      }

      if ((key === "k" || key === "arrowup") && listNavArmedRef.current) {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex((index) => Math.max(index - 1, 0));
        return;
      }

      const matchedView = findAppViewByLetter(key);
      if (matchedView) {
        event.preventDefault();
        event.stopPropagation();
        onSelectRef.current(matchedView.id);
        onCloseRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  const handleSelect = (view: AppView) => {
    onSelect(view);
    onClose();
  };

  return (
    <div className="command-panel-root" role="presentation">
      <div className="command-panel-overlay" aria-hidden onClick={onClose} />
      <div
        ref={listRef}
        className="command-panel"
        role="dialog"
        aria-label="Go to"
        tabIndex={-1}
      >
        <div className="command-panel-section">Navigation</div>
        <SlidingListHighlight
          highlightRect={highlightRect}
          className="command-panel-highlight"
          animateClassName="command-panel-highlight-animate"
          animate={highlightReady}
        />
        {APP_VIEWS.map((view, index) => (
          <CommandPanelItem
            key={view.id}
            view={view}
            isActive={index === selectedIndex}
            buttonRef={setItemRef(index)}
            onSelect={handleSelect}
            onHover={() => setSelectedIndex(index)}
          />
        ))}
      </div>
    </div>
  );
}
