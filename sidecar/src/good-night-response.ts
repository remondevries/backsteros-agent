import { formatMetricValue } from "./daily-note.ts";
import { buildUpdateConfirmationToken } from "./update-confirmation.ts";
import type { WhoopSnapshotEntity } from "./types.ts";

export function isProductiveDay(productivityScore: number | null | undefined): boolean {
  return productivityScore != null && productivityScore >= 5;
}

export function isBusyDay(completedIssueCount: number, movedIssueCount: number): boolean {
  return completedIssueCount + movedIssueCount > 3;
}

export function linearCompletedCountToken(count: number): string {
  return `{{linear-completed-count:${count}}}`;
}

export function linearMovedCountToken(count: number): string {
  return `{{linear-moved-count:${count}}}`;
}

export function whoopStrainScoreToken(score: number): string {
  return `{{whoop-strain-score:${formatMetricValue(score)}}}`;
}

export function whoopStrainTargetToken(score: number): string {
  return `{{whoop-strain-target:${formatMetricValue(score)}}}`;
}

export function whoopSleepDurationToken(duration: string): string {
  return `{{whoop-sleep-duration:${duration.replace(/\s+/g, "_")}}}`;
}

export function emphasisToken(text: string): string {
  return `{{emphasis:${text}}}`;
}

export function describeCompletedResultPhrase(productivityScore: number | null | undefined): string {
  return isProductiveDay(productivityScore)
    ? "a solid result"
    : emphasisToken("progress worth noting");
}

export function describeStrainFollowUp(
  score: number,
  target?: WhoopSnapshotEntity["strainTarget"],
): string {
  const lower = target?.optimalLower;
  const upper = target?.optimalUpper;
  const targetValue = target?.value;

  if (lower != null && score < lower) {
    return "there's room to push a bit harder tomorrow";
  }
  if (upper != null && score > upper) {
    return emphasisToken("you pushed hard today");
  }
  if (targetValue != null && score < targetValue - 0.4) {
    return "there's room to push a bit harder tomorrow";
  }
  if (targetValue != null && score > targetValue + 0.4) {
    return emphasisToken("you pushed hard today");
  }

  return emphasisToken("you landed close to your target");
}

export function resolveStrainTargetValue(target?: WhoopSnapshotEntity["strainTarget"]): number | null {
  if (target?.value != null && !Number.isNaN(target.value)) {
    return target.value;
  }
  if (target?.optimalLower != null && !Number.isNaN(target.optimalLower)) {
    return target.optimalLower;
  }
  return null;
}

export function describeSleepFollowUp(duration?: string | null): string | null {
  if (!duration?.trim()) return null;
  return "at least 2 more hours";
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
  const greeting = firstName ? `Good evening, ${firstName},` : "Good evening,";
  const busy = isBusyDay(input.completedIssueCount, input.movedIssueCount);
  const completedToken = linearCompletedCountToken(input.completedIssueCount);
  const movedToken = linearMovedCountToken(input.movedIssueCount);
  const resultPhrase = describeCompletedResultPhrase(input.productivityScore);

  const paragraphs = [greeting, ""];

  if (input.completedIssueCount > 0) {
    paragraphs.push(
      busy
        ? `It looked like a busy day — and you still closed out ${completedToken} issues, which is ${resultPhrase}.`
        : `You closed out ${completedToken} issues today, which is ${resultPhrase}.`,
    );
  } else {
    paragraphs.push("You didn't close out any Linear issues today.");
  }

  if (input.movedIssueCount > 0) {
    paragraphs.push(`I moved the remaining ${movedToken} to tomorrow.`);
  } else {
    paragraphs.push("Nothing was left to move to tomorrow.");
  }

  const strainScore = input.whoop?.strainScore;
  const strainTarget = resolveStrainTargetValue(input.whoop?.strainTarget);
  if (strainScore != null && !Number.isNaN(strainScore)) {
    if (strainTarget != null) {
      paragraphs.push(
        `Your strain target was ${whoopStrainTargetToken(strainTarget)}, but you reached ${whoopStrainScoreToken(strainScore)}, so ${describeStrainFollowUp(strainScore, input.whoop?.strainTarget)}.`,
      );
    } else {
      paragraphs.push(`You reached ${whoopStrainScoreToken(strainScore)} strain today.`);
    }
  }

  const sleepDuration = input.whoop?.sleepDuration?.trim();
  const sleepFollowUp = describeSleepFollowUp(sleepDuration);
  if (sleepDuration && sleepFollowUp) {
    paragraphs.push(
      `You also slept ${whoopSleepDurationToken(sleepDuration)} last night; aim for ${sleepFollowUp} tonight.`,
    );
  } else if (sleepDuration) {
    paragraphs.push(`You slept ${whoopSleepDurationToken(sleepDuration)} last night.`);
  }

  paragraphs.push(
    "Before you sign off, I have a few questions so I can log this in your journal for you.",
  );

  return paragraphs.join("\n\n");
}

export const GOOD_NIGHT_REFLECTION_CONFIRMATION_MESSAGE =
  "Thanks for your answers, I have processed them into your journal. Get some good rest...";

export function buildGoodNightReflectionResponse(): string {
  return buildUpdateConfirmationToken(
    "reflection",
    "journal",
    GOOD_NIGHT_REFLECTION_CONFIRMATION_MESSAGE,
  );
}
