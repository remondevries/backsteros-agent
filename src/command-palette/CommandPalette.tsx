import { Command } from "cmdk";
import { useEffect, useMemo, type ReactNode } from "react";
import { useContentPanelNavigation } from "../app/contentPanelNavigation";
import {
  SidebarContactsIcon,
  SidebarFinancialsIcon,
  SidebarInboxIcon,
  SidebarKnowledgeBaseIcon,
  SidebarLettersIcon,
  SidebarMeetingsIcon,
  SidebarOrganizationsIcon,
} from "../app/SidebarNavIcons";
import { ProjectIcon } from "../ui/icons/ProjectIcon";
import { DocumentIcon } from "../ui/icons/DocumentIcon";
import { sidebarNavItemIcon } from "../app/sidebarNavConfig";
import { SidebarProjectsIcon } from "../app/SidebarNavIcons";
import { useCommandPalette } from "./CommandPaletteContext";
import type { LinearSidebarTeamConfig } from "../app/sidebarNavConfig";
import { useCommandPaletteActions } from "./useCommandPaletteActions";
import { useCommandPaletteSearch } from "./useCommandPaletteSearch";
import {
  getCommandPaletteContextLabel,
  resolveCommandPaletteSearchContext,
  type CommandPaletteSearchContext,
} from "./commandPaletteSearchContext";
import type { CommandPaletteFilterMode } from "./commandPaletteFilter";
import { commandPaletteItemValue, type CommandPaletteItem } from "./types";
import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import type { SettingsTabId } from "../settings/settingsTabs";
import { useAdministratorAccess } from "../settings/useAdministratorAccess";
import { useActiveWorkoutSession } from "../app/ActiveWorkoutSessionContext";
import { SidebarWorkoutsIcon } from "../app/SidebarNavIcons";

const FILTER_PLACEHOLDERS: Partial<Record<CommandPaletteFilterMode, string>> = {
  projects: "Search projects…",
  documents: "Search documents…",
  contacts: "Search contacts…",
  organizations: "Search organizations…",
  letters: "Search letters…",
  meetings: "Search meetings…",
  inbox: "Search inbox…",
  financials: "Search financials…",
  kb: "Search knowledge base…",
};

const FILTER_CHIP_CONFIG: Partial<
  Record<
    CommandPaletteFilterMode,
    {
      ariaLabel: string;
      icon: ReactNode;
    }
  >
> = {
  projects: {
    ariaLabel: "Projects filter active",
    icon: <ProjectIcon className="linear-project-icon" size={14} />,
  },
  documents: {
    ariaLabel: "Documents filter active",
    icon: <DocumentIcon className="linear-project-icon" size={14} />,
  },
  contacts: {
    ariaLabel: "Contacts filter active",
    icon: <SidebarContactsIcon className="linear-project-icon" />,
  },
  organizations: {
    ariaLabel: "Organizations filter active",
    icon: <SidebarOrganizationsIcon className="linear-project-icon" />,
  },
  letters: {
    ariaLabel: "Letters filter active",
    icon: <SidebarLettersIcon className="linear-project-icon" />,
  },
  meetings: {
    ariaLabel: "Meetings filter active",
    icon: <SidebarMeetingsIcon className="linear-project-icon" />,
  },
  inbox: {
    ariaLabel: "Inbox filter active",
    icon: <SidebarInboxIcon className="linear-project-icon" />,
  },
  financials: {
    ariaLabel: "Financials filter active",
    icon: <SidebarFinancialsIcon className="linear-project-icon" />,
  },
  kb: {
    ariaLabel: "Knowledge base filter active",
    icon: <SidebarKnowledgeBaseIcon className="linear-project-icon" />,
  },
};

export function CommandPalette({
  vaultExplorerEnabled,
  activeVaultNavItem,
  linearSidebarTeamConfig,
  settingsOpen,
  onVaultNavItemChange,
  onVaultNavItemChangeQuiet,
  onOpenSettings,
  onSettingsTabChange,
}: {
  vaultExplorerEnabled: boolean;
  activeVaultNavItem: SidebarNavItemId | null;
  linearSidebarTeamConfig: LinearSidebarTeamConfig;
  settingsOpen: boolean;
  onVaultNavItemChange: (item: SidebarNavItemId | null) => void;
  onVaultNavItemChangeQuiet?: (item: SidebarNavItemId) => void;
  onOpenSettings: () => void;
  onSettingsTabChange: (tab: SettingsTabId) => void;
}) {
  const { open, setOpen } = useCommandPalette();
  const { isActive: activeWorkoutSession, openWorkoutSession } = useActiveWorkoutSession();
  const { isAdministrator } = useAdministratorAccess();
  const { linearSelection } = useContentPanelNavigation();
  const searchContext = useMemo(
    () =>
      resolveCommandPaletteSearchContext({
        activeVaultNavItem,
        linearSelection,
        settingsOpen,
      }),
    [activeVaultNavItem, linearSelection, settingsOpen],
  );
  const {
    filterMode,
    searchTerm,
    setSearchTerm,
    clearActiveFilter,
    groupedItems,
    activeSections,
    loading,
    remoteError,
    reset,
  } = useCommandPaletteSearch({
    enabled: open,
    vaultExplorerEnabled,
    linearSidebarTeamConfig,
    searchContext,
    isAdministrator,
  });

  const performItem = useCommandPaletteActions({
    onVaultNavItemChange,
    onVaultNavItemChangeQuiet,
    onOpenSettings,
    onSettingsTabChange,
    onClose: () => setOpen(false),
  });

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      const shell = document.querySelector(".command-palette-shell");
      if (shell?.contains(target)) {
        return;
      }
      if (document.querySelector(".ios-mobile-bottom-nav")?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [open, setOpen]);

  const hasResults = activeSections.some((section) => groupedItems[section].length > 0);
  const showResults = searchTerm.trim().length > 0 || loading;
  const filterChip = FILTER_CHIP_CONFIG[filterMode];
  const contextLabel =
    filterMode === "all" ? getCommandPaletteContextLabel(searchContext) : null;
  const inputPlaceholder =
    FILTER_PLACEHOLDERS[filterMode] ??
    "Search navigation, notes, projects, and issues… (p d c o l m i f k + space)";

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      className="command-palette"
      overlayClassName="command-palette-overlay"
      contentClassName="command-palette-dialog"
      shouldFilter={false}
    >
      <div className="command-palette-shell">
        <div className="command-palette-chrome">
          {contextLabel && searchContext ? (
            <div className="command-palette-context-label">
              <span className="command-palette-context-label-icon" aria-hidden="true">
                {commandPaletteContextIcon(searchContext)}
              </span>
              <span className="command-palette-context-label-name">{contextLabel}</span>
            </div>
          ) : null}
          <div className="command-palette-input-row">
            {filterChip ? (
              <span className="command-palette-filter-chip" aria-label={filterChip.ariaLabel}>
                {filterChip.icon}
              </span>
            ) : null}
            <Command.Input
              value={searchTerm}
              onValueChange={setSearchTerm}
              onKeyDown={(event) => {
                if (
                  filterChip &&
                  event.key === "Backspace" &&
                  searchTerm.length === 0 &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  clearActiveFilter();
                }
              }}
              placeholder={inputPlaceholder}
              className="command-palette-input"
              autoFocus
            />
          </div>
          {showResults ? (
            <Command.List className="command-palette-list">
              {loading ? <div className="command-palette-status">Searching…</div> : null}
              {remoteError ? (
                <div className="command-palette-status command-palette-status--error">{remoteError}</div>
              ) : null}
              {!loading && !remoteError && searchTerm.trim() && !hasResults ? (
                <Command.Empty className="command-palette-empty">No results found.</Command.Empty>
              ) : null}
              {activeSections.map((section) => {
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
          ) : null}
        </div>
        {activeWorkoutSession ? (
          <div className="command-palette-workout-session-anchor">
            <button
              type="button"
              className="command-palette-workout-session-link"
              onClick={() => {
                openWorkoutSession();
                setOpen(false);
              }}
            >
              <span
                className="command-palette-workout-session-link-icon command-palette-workout-session-link-icon--active"
                aria-hidden="true"
              >
                <SidebarWorkoutsIcon className="command-palette-workout-session-link-svg" />
              </span>
              <span className="command-palette-workout-session-link-label">Active workout</span>
            </button>
          </div>
        ) : null}
      </div>
    </Command.Dialog>
  );
}

function commandPaletteContextIcon(context: CommandPaletteSearchContext): ReactNode {
  const iconClassName = "linear-project-icon";

  if (context.kind === "vault-folder") {
    return sidebarNavItemIcon(context.navItemId);
  }

  if (context.kind === "linear-project") {
    return <ProjectIcon className={iconClassName} size={14} />;
  }

  return <SidebarProjectsIcon className={iconClassName} />;
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
