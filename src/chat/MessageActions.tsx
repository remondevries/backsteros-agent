import { useEffect, useRef, useState } from "react";
import { useTtsPlayback } from "../hooks/useTtsPlayback";
import {
  getLivePlaybackProgress,
  isRunPlaybackPinned,
  pauseSpeaking,
  pinPlaybackSession,
  prefetchSpeech,
  resumeSpeaking,
  speak,
  subscribeToTtsPlayback,
} from "../lib/tts";

function PlayProgressIcon({
  runPlaybackId,
  icon,
  keepRingUpdates,
}: {
  runPlaybackId: string;
  icon: "play" | "pause";
  keepRingUpdates: boolean;
}) {
  const ringRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    let frameId = 0;

    const paintRing = () => {
      const ring = ringRef.current;
      if (!ring) return;

      const progress = getLivePlaybackProgress(runPlaybackId);
      ring.style.strokeDasharray = "1";
      ring.style.strokeDashoffset = String(1 - progress);
    };

    const tick = () => {
      paintRing();
      if (keepRingUpdates || isRunPlaybackPinned(runPlaybackId)) {
        frameId = requestAnimationFrame(tick);
      } else {
        frameId = 0;
      }
    };

    paintRing();
    frameId = requestAnimationFrame(tick);

    const unsubscribe = subscribeToTtsPlayback(() => {
      paintRing();
      if ((keepRingUpdates || isRunPlaybackPinned(runPlaybackId)) && frameId === 0) {
        frameId = requestAnimationFrame(tick);
      }
    });

    return () => {
      unsubscribe();
      if (frameId !== 0) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [runPlaybackId, keepRingUpdates]);

  return (
    <span className="play-progress-button-icon">
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="play-progress-ring-svg"
      >
        <circle
          cx="12"
          cy="12"
          r={10}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.22}
          strokeWidth="1.25"
        />
        <circle
          ref={ringRef}
          cx="12"
          cy="12"
          r={10}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={1}
          transform="rotate(-90 12 12)"
          className="play-progress-ring"
        />
      </svg>
      <svg viewBox="0 0 16 16" aria-hidden="true" className="play-progress-glyph-svg">
        {icon === "pause" ? (
          <path
            d="M5.25 4.5h2v7h-2v-7Zm3.75 0h2v7h-2v-7Z"
            fill="currentColor"
          />
        ) : (
          <path d="M5.5 3 13.5 8 5.5 13Z" fill="currentColor" />
        )}
      </svg>
    </span>
  );
}

export function MessageActions({
  text,
  playbackId,
  canSpeak,
  showCopy = true,
}: {
  text: string;
  playbackId?: string;
  canSpeak?: boolean;
  showCopy?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const { isPlaying, isPaused, isPinned } = useTtsPlayback(playbackId ?? "");

  if (!text.trim()) return null;

  const showSpeak = Boolean(canSpeak && playbackId);
  if (!showCopy && !showSpeak) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable in some webview contexts.
    }
  }

  function handlePlayback() {
    if (!canSpeak || !playbackId) return;
    if (isPlaying) {
      pauseSpeaking();
      return;
    }
    if (isPaused) {
      void resumeSpeaking();
      return;
    }
    pinPlaybackSession(playbackId);
    void speak(text, { playbackId });
  }

  function handlePlaybackHover() {
    if (!canSpeak || !playbackId || isPlaying || isPaused) return;
    prefetchSpeech(text, { playbackId });
  }

  const playbackLabel = isPlaying
    ? "Pause message"
    : isPaused
      ? "Resume message"
      : "Read message aloud";

  return (
    <div className="message-actions">
      {showSpeak && (
        <button
          type="button"
          className={`message-action-playback ${isPlaying ? "message-action-playback-active" : ""} ${isPinned ? "message-action-playback-pinned" : ""}`}
          onClick={handlePlayback}
          onMouseEnter={handlePlaybackHover}
          aria-label={playbackLabel}
          title={playbackLabel}
        >
          <PlayProgressIcon
            runPlaybackId={playbackId!}
            icon={isPlaying ? "pause" : "play"}
            keepRingUpdates={isPlaying || isPaused}
          />
        </button>
      )}
      {showCopy && (
        <button
          type="button"
          className="message-action-button message-action-copy"
          onClick={() => void handleCopy()}
          aria-label={copied ? "Copied" : "Copy message"}
          title={copied ? "Copied" : "Copy message"}
        >
          {copied ? (
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M3 8.5l3 3 7-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect
                x="5"
                y="5"
                width="8"
                height="9"
                rx="1.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
              />
              <path
                d="M4 11V3.5A1.5 1.5 0 0 1 5.5 2H11"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
