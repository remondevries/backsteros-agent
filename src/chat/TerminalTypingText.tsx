import { useEffect, useState } from "react";
import { AssistantMessageContent } from "./AssistantMessageContent";
import {
  contentHasInlineTokens,
  logicalContentLength,
  sliceContentForTyping,
} from "./inlineContentTokens";

const CHARS_PER_TICK = 2;
const TICK_MS = 22;

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

  // Single-asterisk italic: count * that are not part of **.
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
  readingAloud = false,
  liveStream = false,
  typingAnimated = false,
  onTypingComplete,
  onOpenLinearDashboard,
  onOpenWhoopDashboard,
}: {
  text: string;
  running: boolean;
  readingAloud?: boolean;
  liveStream?: boolean;
  typingAnimated?: boolean;
  onTypingComplete?: () => void;
  onOpenLinearDashboard?: () => void;
  onOpenWhoopDashboard?: () => void;
}) {
  const hasInlineTokens = contentHasInlineTokens(text);
  const targetLength = hasInlineTokens ? logicalContentLength(text) : text.length;
  const shouldRevealProgressively = typingAnimated && !liveStream;

  const [displayedLength, setDisplayedLength] = useState(() =>
    shouldRevealProgressively ? 0 : targetLength,
  );

  useEffect(() => {
    if (!shouldRevealProgressively) {
      setDisplayedLength(targetLength);
      return;
    }

    if (displayedLength >= targetLength) {
      return;
    }

    const timer = window.setInterval(() => {
      setDisplayedLength((current) => Math.min(current + CHARS_PER_TICK, targetLength));
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [text, displayedLength, shouldRevealProgressively, targetLength]);

  const displayed = hasInlineTokens
    ? sliceContentForTyping(text, displayedLength)
    : visibleMarkdownSlice(text, displayedLength);
  const isThinking = running && text.length === 0;
  const caughtUp = displayedLength >= targetLength;

  useEffect(() => {
    if (!running && caughtUp && text.length > 0) {
      onTypingComplete?.();
    }
  }, [running, caughtUp, text.length, onTypingComplete]);

  const showCursor = isThinking || !caughtUp || running;

  if (isThinking) {
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
      {showCursor && (
        <span className="terminal-cursor" aria-hidden="true">
          ▌
        </span>
      )}
    </div>
  );
}
