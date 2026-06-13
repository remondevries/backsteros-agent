import { useCallback, useEffect, useRef, useState } from "react";
import { fetchLinearProjectWatcherConfig } from "../lib/api";
import {
  addLinearWatcherStreamListener,
  isLinearWatcherPollEvent,
} from "../lib/linearWatcherEvents";
import { subscribeWatcherConfigSync } from "../lib/linearWatcherConfigSync";

function normalizePollIntervalMs(value: number): 15_000 | 30_000 | 60_000 {
  if (value <= 15_000) return 15_000;
  if (value >= 60_000) return 60_000;
  if (value <= 22_500) return 15_000;
  if (value <= 45_000) return 30_000;
  return 60_000;
}

export function useLinearProjectWatcherPollProgress(
  projectId: string | null,
  options?: { settingsPanelOpen?: boolean },
) {
  const [enabled, setEnabled] = useState(false);
  const [autoDispatchAgents, setAutoDispatchAgents] = useState(false);
  const [pollIntervalMs, setPollIntervalMs] = useState<15_000 | 30_000 | 60_000>(30_000);
  const [animationKey, setAnimationKey] = useState(0);
  const previousSettingsOpenRef = useRef(options?.settingsPanelOpen ?? false);

  const loadConfig = useCallback(async () => {
    if (!projectId) {
      setEnabled(false);
      setAutoDispatchAgents(false);
      return;
    }

    try {
      const result = await fetchLinearProjectWatcherConfig(projectId);
      if (result.error || !result.config) {
        setEnabled(false);
        setAutoDispatchAgents(false);
        return;
      }

      setEnabled(result.config.enabled);
      setAutoDispatchAgents(result.config.autoDispatchAgents ?? false);
      setPollIntervalMs(normalizePollIntervalMs(result.config.pollIntervalMs));
      if (result.config.enabled) {
        setAnimationKey((current) => current + 1);
      }
    } catch {
      setEnabled(false);
      setAutoDispatchAgents(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    const settingsPanelOpen = options?.settingsPanelOpen ?? false;
    if (previousSettingsOpenRef.current && !settingsPanelOpen) {
      void loadConfig();
    }
    previousSettingsOpenRef.current = settingsPanelOpen;
  }, [loadConfig, options?.settingsPanelOpen]);

  useEffect(() => {
    if (!projectId) return;

    return subscribeWatcherConfigSync((syncProjectId, config) => {
      if (syncProjectId !== projectId) return;
      setEnabled(config.enabled);
      setAutoDispatchAgents(config.autoDispatchAgents);
      setPollIntervalMs(normalizePollIntervalMs(config.pollIntervalMs));
      if (config.enabled) {
        setAnimationKey((current) => current + 1);
      }
    });
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    return addLinearWatcherStreamListener((event) => {
      if (!isLinearWatcherPollEvent(event) || event.projectId !== projectId) {
        return;
      }
      setEnabled(true);
      setPollIntervalMs(normalizePollIntervalMs(event.pollIntervalMs));
      setAnimationKey((current) => current + 1);
    });
  }, [projectId]);

  return {
    watcherActive: enabled,
    autoAssignActive: enabled && autoDispatchAgents,
    pollIntervalMs,
    animationKey,
  };
}
