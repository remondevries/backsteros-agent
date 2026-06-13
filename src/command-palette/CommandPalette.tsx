import { Command } from "cmdk";
import { useEffect } from "react";
import { useCommandPalette } from "./CommandPaletteContext";
import { useCommandPaletteActions } from "./useCommandPaletteActions";
import { useCommandPaletteSearch } from "./useCommandPaletteSearch";
import {
  COMMAND_PALETTE_SECTIONS,
  commandPaletteItemValue,
  type CommandPaletteItem,
} from "./types";
import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import type { SettingsTabId } from "../settings/settingsTabs";

export function CommandPalette({
  vaultExplorerEnabled,
  onVaultNavItemChange,
  onOpenSettings,
  onSettingsTabChange,
}: {
  vaultExplorerEnabled: boolean;
  onVaultNavItemChange: (item: SidebarNavItemId | null) => void;
  onOpenSettings: () => void;
  onSettingsTabChange: (tab: SettingsTabId) => void;
}) {
  const { open, setOpen } = useCommandPalette();
  const { query, setQuery, groupedItems, loading, remoteError, reset } = useCommandPaletteSearch({
    enabled: open,
    vaultExplorerEnabled,
  });

  const performItem = useCommandPaletteActions({
    onVaultNavItemChange,
    onOpenSettings,
    onSettingsTabChange,
    onClose: () => setOpen(false),
  });

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const hasResults = COMMAND_PALETTE_SECTIONS.some(
    (section) => groupedItems[section].length > 0,
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      className="command-palette"
      shouldFilter={false}
    >
      <div className="command-palette-chrome">
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search navigation, notes, issues, and projects…"
          className="command-palette-input"
          autoFocus
        />
        <Command.List className="command-palette-list">
          {loading ? <div className="command-palette-status">Searching…</div> : null}
          {remoteError ? (
            <div className="command-palette-status command-palette-status--error">{remoteError}</div>
          ) : null}
          {!loading && !remoteError && !hasResults ? (
            <Command.Empty className="command-palette-empty">No results found.</Command.Empty>
          ) : null}
          {COMMAND_PALETTE_SECTIONS.map((section) => {
            const items = groupedItems[section];
            if (items.length === 0) return null;
            return (
              <Command.Group key={section} heading={section} className="command-palette-group">
                {items.map((item) => (
                  <CommandPaletteRow key={commandPaletteItemValue(item)} item={item} onSelect={performItem} />
                ))}
              </Command.Group>
            );
          })}
        </Command.List>
      </div>
    </Command.Dialog>
  );
}

function CommandPaletteRow({
  item,
  onSelect,
}: {
  item: CommandPaletteItem;
  onSelect: (item: CommandPaletteItem) => void;
}) {
  return (
    <Command.Item
      value={commandPaletteItemValue(item)}
      onSelect={() => onSelect(item)}
      className="command-palette-item"
    >
      <span className="command-palette-item-label">{item.label}</span>
      {item.subtitle ? (
        <span className="command-palette-item-subtitle">{item.subtitle}</span>
      ) : null}
    </Command.Item>
  );
}
