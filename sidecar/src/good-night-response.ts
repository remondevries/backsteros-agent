import { formatMetricValue } from "./daily-note.ts";
import type { WhoopSnapshotEntity } from "./types.ts";

export function isProductiveDay(productivityScore: number | null | undefined): boolean {
  return productivityScore != null && productivityScore >= 5;
}

export function describeProductivityDay(productivityScore: number | null | undefined): string {
  return isProductiveDay(productivityScore) ? "productive" : "not so productive";
}

export function describeTomorrowHope(productivityScore: number | null | undefined): string {
  return isProductiveDay(productivityScore)
    ? "the same or better"
    : "better";
}

export function formatMovedIssuesPhrase(count: number): string {
  if (count === 0) {
    return "I didn't need to move any issues to tomorrow — nothing was left unfinished.";
  }
  if (count === 1) {
    return "I moved 1 issue to tomorrow that we did not finish.";
  }
  return `I moved ${count} issues to tomorrow that we did not finish.`;
}

export function whoopStrainScoreToken(score: number): string {
  return `{{whoop-strain-score:${formatMetricValue(score)}}}`;
}

export function describeStrainTargetStatus(
  score: number,
  target?: WhoopSnapshotEntity["strainTarget"],
): string {
  const lower = target?.optimalLower;
  const upper = target?.optimalUpper;

  if (lower != null && upper != null) {
    if (score >= lower && score <= upper) {
      return "on target";
    }
    if (score < lower) {
      return `${formatMetricValue(lower - score)} below your target`;
    }
    return `${formatMetricValue(score - upper)} above your target`;
  }

  const targetValue = target?.value;
  if (targetValue != null) {
    const diff = score - targetValue;
    if (Math.abs(diff) <= 0.4) {
      return "on target";
    }
    if (diff < 0) {
      return `${formatMetricValue(Math.abs(diff))} below your target`;
    }
    return `${formatMetricValue(diff)} above your target`;
  }

  return "on track";
}

export function formatCompletedIssuesClosing(count: number): string | null {
  if (count === 0) {
    return "You didn't complete any Linear issues today.";
  }
  if (count === 1) {
    return "You completed 1 issue today which you see below.";
  }
  return `You completed ${count} issues today which you see below.`;
}

export interface GoodNightChatResponseInput {
  firstName?: string | null;
  movedIssueCount: number;
  completedIssueCount: number;
  productivityScore: number | null;
  whoop: WhoopSnapshotEntity | null;
}

export function buildGoodNightChatResponse(input: GoodNightChatResponseInput): string {
  const firstName = input.firstName?.trim();
  const greeting = firstName ? `Good evening ${firstName},` : "Good evening,";
  const productivityLabel = describeProductivityDay(input.productivityScore);
  const tomorrowHope = describeTomorrowHope(input.productivityScore);

  const lines = [
    greeting,
    "",
    `Today was a ${productivityLabel} day — let's hope tomorrow will be ${tomorrowHope}. ${formatMovedIssuesPhrase(input.movedIssueCount)} I also updated the daily note for you.`,
  ];

  const strainScore = input.whoop?.strainScore;
  if (strainScore != null && !Number.isNaN(strainScore)) {
    const targetStatus = describeStrainTargetStatus(strainScore, input.whoop?.strainTarget);
    lines.push(
      `Your strain was ${whoopStrainScoreToken(strainScore)} today which is ${targetStatus}.`,
    );
  } else {
    lines.push("Your strain data isn't available yet.");
  }

  const completedClosing = formatCompletedIssuesClosing(input.completedIssueCount);
  if (completedClosing) {
    lines.push(completedClosing);
  }

  return lines.join("\n\n");
}
