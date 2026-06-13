import { useCallback, useEffect, useRef, useState } from "react";
import { fetchLinearProjectWatcherConfig } from "../lib/api";
import {
  addLinearWatcherStreamListener,
  isLinearWatcherPollEvent,
} from "../lib/linearWatcherEvents";

export function useLinearProjectWatcherPollProgress(
  projectId: string | null,
  options?: { settingsPanelOpen?: boolean },
) {
  const [enabled, setEnabled] = useState(false);
  const [pollIntervalMs, setPollIntervalMs] = useState(30_000);
  const [animationKey, setAnimationKey] = useState(0);
  const previousSettingsOpenRef = useRef(options?.settingsPanelOpen ?? false);

  const loadConfig = useCallback(async () => {
    if (!projectId) {
      setEnabled(false);
      return;
    }

    try {
      const result = await fetchLinearProjectWatcherConfig(projectId);
      if (result.error || !result.config) {
        setEnabled(false);
        return;
      }

      setEnabled(result.config.enabled);
      setPollIntervalMs(result.config.pollIntervalMs);
      if (result.config.enabled) {
        setAnimationKey((current) => current + 1);
      }
    } catch {
      setEnabled(false);
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

    return addLinearWatcherStreamListener((event) => {
      if (!isLinearWatcherPollEvent(event) || event.projectId !== projectId) {
        return;
      }
      setEnabled(true);
      setPollIntervalMs(event.pollIntervalMs);
      setAnimationKey((current) => current + 1);
    });
  }, [projectId]);

  return {
    watcherActive: enabled,
    pollIntervalMs,
    animationKey,
  };
}
