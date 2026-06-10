import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  fetchLinearProjectById,
  fetchLinearProjectsPage,
  type LinearProjectSummary,
} from "../lib/api";

const SEARCH_DEBOUNCE_MS = 280;
const PAGE_SIZE = 25;

function mergeProjects(
  current: LinearProjectSummary[],
  incoming: LinearProjectSummary[],
): LinearProjectSummary[] {
  const seen = new Set(current.map((project) => project.id));
  const next = [...current];
  for (const project of incoming) {
    if (seen.has(project.id)) continue;
    seen.add(project.id);
    next.push(project);
  }
  return next;
}

export function LinearProjectPicker({
  value,
  onChange,
  disabled,
  id,
}: {
  value: string;
  onChange: (projectId: string) => void;
  disabled?: boolean;
  id?: string;
}) {
  const fallbackId = useId();
  const fieldId = id ?? fallbackId;
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [projects, setProjects] = useState<LinearProjectSummary[]>([]);
  const [selectedProject, setSelectedProject] = useState<LinearProjectSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    if (!value) {
      setSelectedProject(null);
      return;
    }

    if (selectedProject?.id === value) return;

    const existing = projects.find((project) => project.id === value);
    if (existing) {
      setSelectedProject(existing);
      return;
    }

    let cancelled = false;
    void fetchLinearProjectById(value)
      .then((result) => {
        if (!cancelled) {
          setSelectedProject(result.project);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedProject({ id: value, name: "Selected project" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [value, projects, selectedProject?.id]);

  const loadPage = useCallback(
    async (options: { reset: boolean; after?: string | null; query: string }) => {
      const requestId = ++requestIdRef.current;
      if (options.reset) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const page = await fetchLinearProjectsPage({
          query: options.query || undefined,
          after: options.after ?? undefined,
          first: PAGE_SIZE,
        });

        if (requestId !== requestIdRef.current) return;

        setProjects((current) =>
          options.reset ? page.projects : mergeProjects(current, page.projects),
        );
        setHasMore(page.pageInfo.hasNextPage);
        setCursor(page.pageInfo.endCursor);
        setError(null);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : "Could not load Linear projects");
        if (options.reset) {
          setProjects([]);
          setHasMore(false);
          setCursor(null);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    void loadPage({ reset: true, query: debouncedSearch });
  }, [open, debouncedSearch, loadPage]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || !hasMore || loading || loadingMore) return;

    const target = loadMoreRef.current;
    const root = listRef.current;
    if (!target || !root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        if (!cursor || loadingMore) return;
        void loadPage({ reset: false, after: cursor, query: debouncedSearch });
      },
      { root, rootMargin: "40px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [open, hasMore, loading, loadingMore, cursor, debouncedSearch, loadPage]);

  function handleSelect(project: LinearProjectSummary) {
    setSelectedProject(project);
    onChange(project.id);
    setOpen(false);
    setSearch("");
  }

  function handleClear() {
    setSelectedProject(null);
    onChange("");
  }

  const triggerLabel = selectedProject?.name ?? "Select a project…";

  return (
    <div
      ref={rootRef}
      className={`linear-project-picker ${open ? "linear-project-picker--open" : ""}`}
    >
      <button
        type="button"
        id={fieldId}
        className="linear-project-picker-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
      >
        <span
          className={
            selectedProject
              ? "linear-project-picker-trigger-label"
              : "linear-project-picker-trigger-placeholder"
          }
        >
          {triggerLabel}
        </span>
        <span className="linear-project-picker-trigger-caret" aria-hidden="true" />
      </button>

      {value && !disabled && (
        <button
          type="button"
          className="linear-project-picker-clear"
          onClick={handleClear}
          aria-label="Clear grocery project"
        >
          Clear
        </button>
      )}

      {open && (
        <div className="linear-project-picker-panel" role="presentation">
          <div className="linear-project-picker-search-wrap">
            <input
              type="search"
              className="linear-project-picker-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects…"
              autoFocus
              spellCheck={false}
              aria-label="Search Linear projects"
            />
          </div>

          <div
            ref={listRef}
            className="linear-project-picker-list"
            role="listbox"
            aria-labelledby={fieldId}
          >
            {loading && projects.length === 0 ? (
              <p className="linear-project-picker-status">Loading projects…</p>
            ) : error && projects.length === 0 ? (
              <p className="linear-project-picker-status linear-project-picker-status-error">
                {error}
              </p>
            ) : projects.length === 0 ? (
              <p className="linear-project-picker-status">
                {debouncedSearch ? "No projects match your search." : "No projects found."}
              </p>
            ) : (
              projects.map((project) => {
                const selected = project.id === value;
                return (
                  <button
                    key={project.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={[
                      "linear-project-picker-option",
                      selected ? "linear-project-picker-option--selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => handleSelect(project)}
                  >
                    <span className="linear-project-picker-option-name">{project.name}</span>
                    {selected && (
                      <span className="linear-project-picker-option-check" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })
            )}

            {loadingMore && (
              <p className="linear-project-picker-status">Loading more…</p>
            )}
            <div ref={loadMoreRef} className="linear-project-picker-sentinel" aria-hidden="true" />
          </div>
        </div>
      )}
    </div>
  );
}
