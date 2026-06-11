import { useCallback, useEffect, useState } from "react";
import { ObsidianIcon } from "../chat/ObsidianIcon";
import { ObsidianNoteRow } from "../chat/ObsidianNoteRow";
import type { MarkdownFileEntity } from "../chat/types";
import { useVault } from "../chat/VaultContext";
import { AppDashboardShell } from "../app/AppDashboardShell";
import { GoodNightFlowCard } from "../flows/GoodNightFlowCard";
import {
  DASHBOARD_CACHE_TTL_MS,
  fetchVaultDailyNoteToday,
  peekCached,
  REQUEST_CACHE_KEYS,
} from "../lib/api";

type VaultDailyNoteResult = Awaited<ReturnType<typeof fetchVaultDailyNoteToday>>;

function extractDayLogPreview(content: string): string {
  const heading = "## Day log";
  const index = content.indexOf(heading);
  if (index < 0) return content.trim().slice(0, 1200);

  const after = content.slice(index + heading.length);
  const nextSection = after.search(/\n##\s+/);
  const body = (nextSection >= 0 ? after.slice(0, nextSection) : after).trim();
  return body.slice(0, 1200);
}

function readCachedVaultDailyNote(): VaultDailyNoteResult | null {
  return peekCached<VaultDailyNoteResult>(
    REQUEST_CACHE_KEYS.vaultDailyNoteToday,
    DASHBOARD_CACHE_TTL_MS,
  );
}

export function ObsidianDashboard() {
  const vault = useVault();
  const initialCache = readCachedVaultDailyNote();
  const [loading, setLoading] = useState(() => initialCache == null);
  const [refreshing, setRefreshing] = useState(false);
  const [date, setDate] = useState(() => initialCache?.note.date ?? "");
  const [path, setPath] = useState(() => initialCache?.note.path ?? "");
  const [exists, setExists] = useState(() => initialCache?.note.exists ?? false);
  const [content, setContent] = useState<string | null>(() => initialCache?.note.content ?? null);
  const [recentNotes, setRecentNotes] = useState<MarkdownFileEntity[]>(
    () => initialCache?.recentNotes ?? [],
  );
  const [error, setError] = useState<string | null>(() => initialCache?.error ?? null);

  const loadVault = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (readCachedVaultDailyNote() == null) {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await fetchVaultDailyNoteToday({ force: isRefresh });
      setDate(result.note.date);
      setPath(result.note.path);
      setExists(result.note.exists);
      setContent(result.note.content ?? null);
      setRecentNotes(result.recentNotes);
      setError(result.error ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load daily note");
      setExists(false);
      setContent(null);
      setRecentNotes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadVault();
  }, [loadVault]);

  const dayLogPreview = content ? extractDayLogPreview(content) : "";

  return (
    <AppDashboardShell
      icon={<ObsidianIcon size={22} />}
      title="Obsidian"
      subtitle={date ? `Daily/${date}.md` : "Daily note"}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void loadVault(true)}
    >
      {loading ? (
        <p className="app-dashboard-empty">Loading today&apos;s daily note…</p>
      ) : error && !exists ? (
        <div className="app-dashboard-empty-state">
          <p>{error}</p>
          <button type="button" className="app-dashboard-action" onClick={() => void loadVault(true)}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <GoodNightFlowCard onComplete={() => void loadVault(true)} />

          <section className="app-dashboard-section">
            <div className="app-dashboard-section-header">
              <h2 className="app-dashboard-section-title">Today</h2>
              {vault && exists && (
                <button
                  type="button"
                  className="app-dashboard-action"
                  onClick={() => void vault.openNote(path)}
                >
                  Open in Obsidian
                </button>
              )}
            </div>

            {!exists ? (
              <p className="app-dashboard-empty">Today&apos;s daily note doesn&apos;t exist yet.</p>
            ) : (
              dayLogPreview && (
                <pre className="app-dashboard-note-preview">{dayLogPreview}</pre>
              )
            )}
          </section>

          {recentNotes.length > 0 && (
            <section className="app-dashboard-section">
              <h2 className="app-dashboard-section-title">Recent daily notes</h2>
              <div className="morning-review-list app-dashboard-list">
                {recentNotes.map((item) => (
                  <ObsidianNoteRow key={item.path} item={item} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </AppDashboardShell>
  );
}
