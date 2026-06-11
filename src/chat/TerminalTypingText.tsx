import { useEffect, useRef, useState } from "react";
import { AssistantMessageContent } from "./AssistantMessageContent";
import { DotScrollLoader } from "./DotScrollLoader";
import {
  contentHasInlineTokens,
  logicalContentLength,
  sliceContentForTyping,
} from "./inlineContentTokens";
import {
  canLeaveLoadingPhase,
  RESPONSE_CURSOR_MS,
  type ResponsePresentationPhase,
} from "./responsePresentation";

const CHARS_PER_TICK = 2;
const TICK_MS = 22;
const LOADING_POLL_MS = 50;

function stripUnclosedInlineMarkdown(slice: string): string {
  const fenceCount = (slice.match(/```/g) ?? []).length;
  if (fenceCount % 2 === 1) {
    const lastFence = slice.lastIndexOf("```");
    slice = slice.slice(0, lastFence);
  }

  const boldCount = (slice.match(/\*\*/g) ?? []).length;
  if (boldCount % 2 === 1) {
    slice = slice.slice(0, slice.lastIndexOf("**"));
  }

  const underscoreCount = (slice.match(/__/g) ?? []).length;
  if (underscoreCount % 2 === 1) {
    slice = slice.slice(0, slice.lastIndexOf("__"));
  }

  let singleUnderscoreCount = 0;
  for (let index = 0; index < slice.length; index += 1) {
    if (slice[index] === "_" && slice[index - 1] !== "_" && slice[index + 1] !== "_") {
      singleUnderscoreCount += 1;
    }
  }
  if (singleUnderscoreCount % 2 === 1) {
    const lastUnderscore = slice.lastIndexOf("_");
    if (lastUnderscore > 0 && slice[lastUnderscore - 1] !== "_" && slice[lastUnderscore + 1] !== "_") {
      slice = slice.slice(0, lastUnderscore);
    }
  }

  let backtickCount = 0;
  for (let index = 0; index < slice.length; index += 1) {
    if (slice[index] === "`") {
      backtickCount += 1;
    }
  }
  if (backtickCount % 2 === 1) {
    slice = slice.slice(0, slice.lastIndexOf("`"));
  }

  let singleAsteriskCount = 0;
  for (let index = 0; index < slice.length; index += 1) {
    if (slice[index] !== "*") continue;
    const isDouble = slice[index - 1] === "*" || slice[index + 1] === "*";
    if (!isDouble) {
      singleAsteriskCount += 1;
    }
  }
  if (singleAsteriskCount % 2 === 1) {
    for (let index = slice.length - 1; index >= 0; index -= 1) {
      if (slice[index] !== "*") continue;
      const isDouble = slice[index - 1] === "*" || slice[index + 1] === "*";
      if (!isDouble) {
        slice = slice.slice(0, index);
        break;
      }
    }
  }

  return slice;
}

function visibleMarkdownSlice(text: string, length: number): string {
  const slice = text.slice(0, length);
  if (!slice) return slice;
  return stripUnclosedInlineMarkdown(slice);
}

export function TerminalTypingText({
  text,
  running,
  startedAt,
  readingAloud = false,
  onTypingComplete,
  onOpenLinearDashboard,
  onOpenWhoopDashboard,
  animate = true,
}: {
  text: string;
  running: boolean;
  startedAt?: number;
  readingAloud?: boolean;
  animate?: boolean;
  onTypingComplete?: () => void;
  onOpenLinearDashboard?: () => void;
  onOpenWhoopDashboard?: () => void;
}) {
  const presentationStartedAtRef = useRef(startedAt ?? Date.now());
  const streamedDuringRunRef = useRef(false);
  const hasInlineTokens = contentHasInlineTokens(text);
  const targetLength = hasInlineTokens ? logicalContentLength(text) : text.length;
  const targetLengthRef = useRef(targetLength);
  targetLengthRef.current = targetLength;
  const effectiveAnimate = animate && !running;
  const [phase, setPhase] = useState<ResponsePresentationPhase>(() =>
    animate && !running ? "loading" : "typing",
  );
  const [displayedLength, setDisplayedLength] = useState(() =>
    animate && !running ? 0 : targetLength,
  );

  useEffect(() => {
    if (running) {
      streamedDuringRunRef.current = true;
      setPhase("typing");
      setDisplayedLength(targetLengthRef.current);
      return;
    }

    if (streamedDuringRunRef.current) {
      streamedDuringRunRef.current = false;
      setPhase("typing");
      setDisplayedLength(targetLengthRef.current);
      return;
    }

    if (!animate) {
      setPhase("typing");
      setDisplayedLength(targetLengthRef.current);
      return;
    }

    setPhase("loading");
    setDisplayedLength(0);
    presentationStartedAtRef.current = startedAt ?? Date.now();
  }, [animate, running, targetLength, startedAt]);

  useEffect(() => {
    if (!effectiveAnimate || phase !== "loading") return;

    const tryAdvance = () => {
      const elapsedMs = Date.now() - presentationStartedAtRef.current;
      if (canLeaveLoadingPhase(elapsedMs, text, running)) {
        setPhase("cursor");
      }
    };

    tryAdvance();
    const timer = window.setInterval(tryAdvance, LOADING_POLL_MS);
    return () => window.clearInterval(timer);
  }, [effectiveAnimate, phase, text, running]);

  useEffect(() => {
    if (!effectiveAnimate || phase !== "cursor") return;

    const timer = window.setTimeout(() => {
      setDisplayedLength(0);
      setPhase("typing");
    }, RESPONSE_CURSOR_MS);

    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (!effectiveAnimate || phase !== "typing") return;

    const timer = window.setInterval(() => {
      setDisplayedLength((current) => {
        const target = targetLengthRef.current;
        if (current >= target) return current;
        return Math.min(current + CHARS_PER_TICK, target);
      });
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [effectiveAnimate, phase]);

  const displayed =
    phase === "typing"
      ? hasInlineTokens
        ? sliceContentForTyping(text, displayedLength)
        : visibleMarkdownSlice(text, displayedLength)
      : "";
  const caughtUp = displayedLength >= targetLength;
  const showStreamingCursor = phase === "typing" && running && !caughtUp;

  useEffect(() => {
    if (phase === "typing" && !running && caughtUp && text.length > 0) {
      onTypingComplete?.();
    }
  }, [phase, running, caughtUp, text.length, onTypingComplete]);

  if (phase === "loading") {
    return (
      <div className="assistant-text terminal-message terminal-message-loading">
        <DotScrollLoader aria-label="Thinking" />
      </div>
    );
  }

  if (phase === "cursor") {
    return (
      <div className="assistant-text terminal-message terminal-message-thinking">
        <span className="terminal-cursor" aria-hidden="true">
          ▌
        </span>
      </div>
    );
  }

  const messageClassName = [
    "assistant-text",
    "terminal-message",
    readingAloud ? "voice-mode-reading" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={messageClassName}>
      {displayed.length > 0 && (
        <AssistantMessageContent
          content={displayed}
          onOpenLinearDashboard={onOpenLinearDashboard}
          onOpenWhoopDashboard={onOpenWhoopDashboard}
        />
      )}
      {showStreamingCursor && (
        <span className="terminal-cursor" aria-hidden="true">
          ▌
        </span>
      )}
    </div>
  );
}
