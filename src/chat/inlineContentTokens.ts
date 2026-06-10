import type { InlineContentPart } from "./inlineContentTokens";

const INLINE_TOKEN_DETECT =
  /\{\{(?:linear-issues-count:\d+|linear-completed-count:\d+|linear-moved-count:\d+|linear-issue-link:[^}]+|whoop-sleep-score:\d+|whoop-recovery-score:\d+|whoop-strain-score:\d+(?:\.\d+)?|whoop-strain-target:\d+(?:\.\d+)?|whoop-sleep-duration:[^}]+|emphasis:[^}]+)\}\}|\[\d+ issues?\]\(backster:\/\/linear-issues\/\d+\)/;

const INLINE_TOKEN_RE =
  /\{\{(linear-issues-count|linear-completed-count|linear-moved-count|linear-issue-link|whoop-sleep-score|whoop-recovery-score|whoop-strain-score|whoop-strain-target|whoop-sleep-duration|emphasis):([^}]+)\}\}|\[(\d+) issues?\]\(backster:\/\/linear-issues\/(\d+)\)/g;

export type InlineContentPart =
  | { type: "text"; value: string }
  | { type: "linear-issues-count"; count: number; raw: string }
  | { type: "linear-completed-count"; count: number; raw: string }
  | { type: "linear-moved-count"; count: number; raw: string }
  | { type: "linear-issue-link"; label: string; url: string; raw: string }
  | { type: "whoop-sleep-score"; score: number; raw: string }
  | { type: "whoop-recovery-score"; score: number; raw: string }
  | { type: "whoop-strain-score"; score: number; raw: string }
  | { type: "whoop-strain-target"; score: number; raw: string }
  | { type: "whoop-sleep-duration"; duration: string; raw: string }
  | { type: "emphasis"; text: string; raw: string };

function parseTokenMatch(match: RegExpMatchArray): InlineContentPart {
  const tokenType = match[1];
  const value = match[2];

  if (tokenType === "linear-issues-count" || tokenType === "linear-completed-count" || tokenType === "linear-moved-count") {
    return {
      type: tokenType,
      count: Number(value),
      raw: match[0],
    };
  }
  if (tokenType === "linear-issue-link") {
    const separatorIndex = value.indexOf("|");
    const encodedLabel = separatorIndex >= 0 ? value.slice(0, separatorIndex) : value;
    const url = separatorIndex >= 0 ? value.slice(separatorIndex + 1) : "";
    return {
      type: "linear-issue-link",
      label: encodedLabel.replace(/_/g, " ").trim(),
      url: url.trim(),
      raw: match[0],
    };
  }
  if (tokenType === "whoop-sleep-score") {
    return { type: "whoop-sleep-score", score: Number(value), raw: match[0] };
  }
  if (tokenType === "whoop-recovery-score") {
    return { type: "whoop-recovery-score", score: Number(value), raw: match[0] };
  }
  if (tokenType === "whoop-strain-score") {
    return { type: "whoop-strain-score", score: Number(value), raw: match[0] };
  }
  if (tokenType === "whoop-strain-target") {
    return { type: "whoop-strain-target", score: Number(value), raw: match[0] };
  }
  if (tokenType === "whoop-sleep-duration") {
    return {
      type: "whoop-sleep-duration",
      duration: value.replace(/_/g, " "),
      raw: match[0],
    };
  }
  if (tokenType === "emphasis") {
    return { type: "emphasis", text: value, raw: match[0] };
  }

  return {
    type: "linear-issues-count",
    count: Number(match[4] ?? match[3]),
    raw: match[0],
  };
}

function isInlineComponentPart(
  part: InlineContentPart,
): part is Exclude<InlineContentPart, { type: "text" }> {
  return part.type !== "text";
}

function inlineComponentLength(_part: Exclude<InlineContentPart, { type: "text" }>): number {
  return 1;
}

export function buildInlineContentParts(text: string): InlineContentPart[] {
  const parts: InlineContentPart[] = [];
  let lastIndex = 0;
  INLINE_TOKEN_RE.lastIndex = 0;

  for (const match of text.matchAll(INLINE_TOKEN_RE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    parts.push(parseTokenMatch(match));
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts;
}

export function contentHasInlineTokens(text: string): boolean {
  return INLINE_TOKEN_DETECT.test(text);
}

export function logicalContentLength(text: string): number {
  if (!contentHasInlineTokens(text)) {
    return text.length;
  }

  return buildInlineContentParts(text).reduce(
    (total, part) =>
      isInlineComponentPart(part) ? total + inlineComponentLength(part) : total + part.value.length,
    0,
  );
}

export function sliceContentForTyping(text: string, displayedLength: number): string {
  const parts = buildInlineContentParts(text);
  let remaining = displayedLength;
  let output = "";

  for (const part of parts) {
    if (remaining <= 0) {
      break;
    }

    if (isInlineComponentPart(part)) {
      output += part.raw;
      remaining -= inlineComponentLength(part);
      continue;
    }

    const take = Math.min(part.value.length, remaining);
    output += part.value.slice(0, take);
    remaining -= take;
  }

  return output;
}
