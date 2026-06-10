import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getRunFixture, RUN_FIXTURES, type RunFixture } from "../fixtures/runFixtures";
import { RunBlock } from "../RunBlock";
import type { RunFixtureId, RunViewModel } from "../types";

const FIXTURE_GROUPS = [
  { title: "Linear", prefix: "linear-" },
  { title: "Obsidian", prefix: "obsidian-" },
  { title: "Calendar", prefix: "calendar-" },
  { title: "Whoop", prefix: "whoop-" },
] as const;

function cloneRun(run: RunViewModel): RunViewModel {
  return {
    ...run,
    steps: run.steps.map((step) => ({ ...step })),
    entities: run.entities.map((entity) =>
      entity.type === "linear_issues"
        ? { ...entity, items: entity.items.map((item) => ({ ...item })) }
        : entity.type === "markdown_files"
          ? { ...entity, items: entity.items.map((item) => ({ ...item })) }
          : entity.type === "calendar_events"
            ? { ...entity, items: entity.items.map((item) => ({ ...item })) }
            : entity.type === "whoop_snapshots"
              ? { ...entity, items: entity.items.map((item) => ({ ...item })) }
              : { ...entity },
    ),
    approvals: run.approvals.map((approval) => ({ ...approval })),
  };
}

export function useRunUiPreviewShortcut(onToggle: () => void) {
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        onToggle();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onToggle]);
}

export function RunUiPreviewPanel({ onClose }: { onClose: () => void }) {
  const [fixtureId, setFixtureId] = useState<RunFixtureId>("linear-search-done");
  const [run, setRun] = useState<RunViewModel>(() => cloneRun(getRunFixture("linear-search-done").run));

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function selectFixture(nextId: RunFixtureId) {
    setFixtureId(nextId);
    setRun(cloneRun(getRunFixture(nextId).run));
  }

  const fixture: RunFixture = getRunFixture(fixtureId);

  return createPortal(
    <div className="run-ui-preview-overlay" role="dialog" aria-modal="true" aria-label="Run UI preview">
      <div className="run-ui-preview-backdrop" onClick={onClose} aria-hidden="true" />
      <section className="run-ui-preview">
        <aside className="run-ui-preview-sidebar">
          <div className="run-ui-preview-sidebar-header">
            <span className="run-ui-preview-label">UI preview</span>
            <button
              type="button"
              className="run-ui-preview-close"
              onClick={onClose}
              aria-label="Close UI preview"
            >
              ×
            </button>
          </div>
          <nav className="run-ui-preview-nav" aria-label="Run UI preview scenarios">
            {FIXTURE_GROUPS.map((group) => (
              <div key={group.title} className="run-ui-preview-group">
                <span className="run-ui-preview-group-label">{group.title}</span>
                <div className="run-ui-preview-scenarios">
                  {RUN_FIXTURES.filter((item) => item.id.startsWith(group.prefix)).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`run-ui-preview-scenario ${item.id === fixtureId ? "active" : ""}`}
                      onClick={() => selectFixture(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="run-ui-preview-stage">
        <div className="chat-turn run-ui-preview-turn">
          <div className="chat-message user">
            <div className="bubble">{fixture.userMessage}</div>
          </div>
          <RunBlock
            run={run}
            onToggle={() =>
              setRun((current) => ({
                ...current,
                expanded: !current.expanded,
              }))
            }
            onApprove={() => undefined}
            onReject={() => undefined}
          />
        </div>
      </div>
      </section>
    </div>,
    document.body,
  );
}
