import { useMemo } from "react";
import { LinearProjectIcon } from "../chat/LinearProjectIcon";
import { DocumentNoteIcon } from "./project-documents/DocumentNoteIcon";
import { SearchableDropdown, type SearchableDropdownOption } from "./ui/SearchableDropdown";

export type KnowledgeBaseCreateAction = "document" | "folder";

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M8 3.25v9.5M3.25 8h9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function KnowledgeBaseCreateMenu({
  disabled,
  onSelect,
}: {
  disabled?: boolean;
  onSelect: (action: KnowledgeBaseCreateAction) => void;
}) {
  const options = useMemo((): SearchableDropdownOption<KnowledgeBaseCreateAction>[] => {
    return [
      {
        value: "document",
        label: "Create document",
        icon: <DocumentNoteIcon size={14} />,
      },
      {
        value: "folder",
        label: "Create folder",
        icon: <LinearProjectIcon title="Folder" />,
      },
    ];
  }, []);

  return (
    <SearchableDropdown
      value={null}
      options={options}
      onChange={onSelect}
      disabled={disabled}
      ariaLabel="Create"
      className="knowledge-base-create-dropdown"
      panelWidth={220}
      panelAlign="end"
      renderTrigger={({ open, disabled: triggerDisabled, triggerId, onToggle }) => (
        <button
          type="button"
          id={triggerId}
          className="vault-folder-explorer-add"
          disabled={triggerDisabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Create"
          title="Create"
          onClick={onToggle}
        >
          <PlusIcon />
        </button>
      )}
    />
  );
}
