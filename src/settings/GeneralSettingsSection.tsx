import { pickDirectory } from "../platform/dialog";

export function GeneralSettingsSection({
  saving,
  projectsPath,
  onProjectsPathChange,
}: {
  saving: boolean;
  projectsPath: string;
  onProjectsPathChange: (path: string) => void;
}) {
  async function pickProjectsFolder() {
    const selected = await pickDirectory(projectsPath || undefined);
    if (selected) {
      onProjectsPathChange(selected);
    }
  }

  return (
    <section className="settings-section">
      <h3 className="settings-subsection-title">Projects</h3>
      <p className="settings-hint settings-hint-spaced-top">
        Folder used as the working directory when opening Issue Terminal.
      </p>
      <label className="settings-field-label" htmlFor="projects-path">
        Projects location
      </label>
      <div className="settings-row">
        <input
          id="projects-path"
          type="text"
          value={projectsPath}
          disabled={saving}
          placeholder="/Users/name/code"
          onChange={(event) => onProjectsPathChange(event.target.value)}
        />
        <button
          type="button"
          className="btn-secondary"
          disabled={saving}
          onClick={() => {
            void pickProjectsFolder();
          }}
        >
          Browse
        </button>
      </div>
    </section>
  );
}
