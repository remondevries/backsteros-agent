import { useEffect, useRef } from "react";
import type { LetterFilingDraft, LetterFilingOptions } from "./letterFiling";

type LetterFilingField = "assigned" | "status" | "received" | "organization" | "project" | "note";

function SelectWithPrefill({
  value,
  options,
  placeholder,
  disabled,
  inputRef,
  onChange,
}: {
  value: string;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  inputRef: React.RefObject<HTMLSelectElement | null>;
  onChange: (value: string) => void;
}) {
  const showPrefill = value.length > 0 && !options.includes(value);

  return (
    <select
      ref={inputRef}
      className="letter-filing-control"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    >
      <option value="">{placeholder}</option>
      {showPrefill ? (
        <option value={value}>{value}</option>
      ) : null}
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

const FIELD_HOTKEYS: Record<string, LetterFilingField> = {
  a: "assigned",
  s: "status",
  r: "received",
  o: "organization",
  p: "project",
  n: "note",
};

export function LetterFilingPanel({
  draft,
  options,
  busy,
  onChange,
  onSubmit,
  onClose,
}: {
  draft: LetterFilingDraft;
  options: LetterFilingOptions;
  busy?: boolean;
  onChange: (next: LetterFilingDraft) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const assignedRef = useRef<HTMLSelectElement>(null);
  const statusRef = useRef<HTMLSelectElement>(null);
  const receivedRef = useRef<HTMLInputElement>(null);
  const organizationRef = useRef<HTMLSelectElement>(null);
  const projectRef = useRef<HTMLSelectElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const fieldRefs: Record<LetterFilingField, React.RefObject<HTMLElement | null>> = {
    assigned: assignedRef,
    status: statusRef,
    received: receivedRef,
    organization: organizationRef,
    project: projectRef,
    note: noteRef,
  };

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      const field = FIELD_HOTKEYS[event.key.toLowerCase()];
      if (!field) return;

      const usesMeta = field === "received";
      if (usesMeta) {
        if (!event.metaKey || event.ctrlKey || event.altKey) return;
      } else if (!event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      event.preventDefault();
      const target = fieldRefs[field].current;
      target?.focus();
      if (target instanceof HTMLSelectElement) {
        target.showPicker?.();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function updateField<K extends keyof LetterFilingDraft>(key: K, value: LetterFilingDraft[K]) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <div className="letter-filing-panel" role="form" aria-label="Letter filing">
      <div className="letter-filing-grid">
        <label className="letter-filing-field">
          <span className="letter-filing-label">
            Assigned
            <span className="letter-filing-hotkey">Ctrl+A</span>
          </span>
          <SelectWithPrefill
            inputRef={assignedRef}
            value={draft.assigned}
            options={options.contacts}
            placeholder="Select contact…"
            disabled={busy}
            onChange={(value) => updateField("assigned", value)}
          />
        </label>

        <label className="letter-filing-field">
          <span className="letter-filing-label">
            Status
            <span className="letter-filing-hotkey">Ctrl+S</span>
          </span>
          <select
            ref={statusRef}
            className="letter-filing-control"
            value={draft.status}
            onChange={(event) =>
              updateField("status", event.target.value as LetterFilingDraft["status"])
            }
            disabled={busy}
          >
            {options.statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="letter-filing-field">
          <span className="letter-filing-label">
            Received
            <span className="letter-filing-hotkey">⌘R</span>
          </span>
          <input
            ref={receivedRef}
            type="date"
            className="letter-filing-control"
            value={draft.received}
            onChange={(event) => updateField("received", event.target.value)}
            disabled={busy}
          />
        </label>

        <label className="letter-filing-field">
          <span className="letter-filing-label">
            Organization
            <span className="letter-filing-hotkey">Ctrl+O</span>
          </span>
          <SelectWithPrefill
            inputRef={organizationRef}
            value={draft.organization}
            options={options.organizations}
            placeholder="Select organization…"
            disabled={busy}
            onChange={(value) => updateField("organization", value)}
          />
        </label>

        <label className="letter-filing-field">
          <span className="letter-filing-label">
            Project
            <span className="letter-filing-hotkey">Ctrl+P</span>
          </span>
          <SelectWithPrefill
            inputRef={projectRef}
            value={draft.project}
            options={options.projects}
            placeholder="Select project…"
            disabled={busy}
            onChange={(value) => updateField("project", value)}
          />
        </label>

        <label className="letter-filing-field letter-filing-field-full">
          <span className="letter-filing-label">
            Note
            <span className="letter-filing-hotkey">Ctrl+N</span>
          </span>
          <textarea
            ref={noteRef}
            className="letter-filing-control letter-filing-note"
            value={draft.note}
            onChange={(event) => updateField("note", event.target.value)}
            rows={3}
            disabled={busy}
          />
        </label>
      </div>

      <div className="letter-filing-actions">
        <button
          type="button"
          className="letter-modal-button letter-modal-button-secondary"
          onClick={onClose}
          disabled={busy}
        >
          Close
          <span className="letter-modal-hotkey">Esc</span>
        </button>
        <button
          type="button"
          className="letter-modal-button letter-modal-button-primary"
          onClick={onSubmit}
          disabled={busy}
        >
          File away
        </button>
      </div>
    </div>
  );
}
