import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchLinearWorkoutSession, type WorkoutSessionEntity } from "../lib/api";

export function useWorkoutDashboardSessions({
  teamId,
  dateKeys,
  enabled,
}: {
  teamId: string;
  dateKeys: string[];
  enabled: boolean;
}) {
  const [sessionsByDate, setSessionsByDate] = useState<Record<string, WorkoutSessionEntity>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedTeamId = teamId.trim();
  const normalizedDateKeys = useMemo(
    () => [...new Set(dateKeys.map((dateKey) => dateKey.trim()).filter(Boolean))].sort(),
    [dateKeys],
  );
  const dateKeysKey = normalizedDateKeys.join("|");

  const loadSessions = useCallback(async () => {
    if (!enabled || !normalizedTeamId || normalizedDateKeys.length === 0) {
      setSessionsByDate({});
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await Promise.all(
        normalizedDateKeys.map(async (dateKey) => {
          const result = await fetchLinearWorkoutSession(normalizedTeamId, dateKey);
          return { dateKey, session: result.session, error: result.error ?? null };
        }),
      );

      const nextSessions: Record<string, WorkoutSessionEntity> = {};
      const errors = results
        .map((entry) => entry.error)
        .filter((message): message is string => Boolean(message));

      for (const entry of results) {
        if (entry.session) {
          nextSessions[entry.dateKey] = entry.session;
        }
      }

      setSessionsByDate(nextSessions);
      setError(errors.length === results.length ? errors[0] ?? "Failed to load workout sessions." : null);
    } catch (err) {
      setSessionsByDate({});
      setError(err instanceof Error ? err.message : "Failed to load workout sessions.");
    } finally {
      setLoading(false);
    }
  }, [dateKeysKey, enabled, normalizedDateKeys, normalizedTeamId]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  return {
    sessionsByDate,
    loading,
    error,
    refresh: loadSessions,
  };
}
