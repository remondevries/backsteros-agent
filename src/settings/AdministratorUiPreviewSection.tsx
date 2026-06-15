import { useUiPreview } from "../chat/dev/UiPreviewContext";

export function AdministratorUiPreviewSection() {
  const { enabled: uiPreviewEnabled, open: uiPreviewOpen, toggle: toggleUiPreview } =
    useUiPreview();

  return (
    <section className="settings-section">
      <p className="settings-hint settings-hint-spaced-top">
        Preview run UI fixtures for Linear, Obsidian, Calendar, and Whoop blocks.
      </p>
      {uiPreviewEnabled ? (
        <>
          <div className="settings-row settings-row-profiles settings-hint-spaced-top">
            <button
              type="button"
              className={[
                "btn-secondary",
                uiPreviewOpen ? "run-ui-preview-toggle active" : "run-ui-preview-toggle",
              ].join(" ")}
              onClick={toggleUiPreview}
            >
              {uiPreviewOpen ? "Close UI preview" : "Open UI preview"}
            </button>
          </div>
          <p className="settings-hint settings-hint-spaced">
            Shortcut: <code>Cmd+Shift+L</code>
          </p>
        </>
      ) : (
        <p className="settings-hint settings-hint-spaced-top">
          UI preview is only available in local development builds.
        </p>
      )}
    </section>
  );
}
