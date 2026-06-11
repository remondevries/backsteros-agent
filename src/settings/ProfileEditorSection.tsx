export function ProfileEditorSection({
  label,
  pathHint,
  value,
  loading,
  disabled,
  onChange,
}: {
  label: string;
  pathHint?: string;
  value: string;
  loading: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <section className="settings-section settings-profile-editor">
      {pathHint ? <p className="settings-hint settings-hint-spaced-top">{pathHint}</p> : null}
      {loading ? (
        <p className="settings-hint">Loading profile…</p>
      ) : (
        <textarea
          className="settings-profile-textarea"
          value={value}
          disabled={disabled}
          spellCheck={false}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </section>
  );
}
