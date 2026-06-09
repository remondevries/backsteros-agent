import type { LinearIssueEntity, WhoopSnapshotEntity } from "./types.ts";

export function isBusyDay(issueCount: number): boolean {
  return issueCount > 3;
}

export function filterUrgentLinearIssues(issues: LinearIssueEntity[]): LinearIssueEntity[] {
  return issues.filter((issue) => issue.priority === 1);
}

export function describeSleepRest(sleepScore: number | null | undefined): {
  restPhrase: string;
  scoreText: string | null;
} {
  if (sleepScore == null || Number.isNaN(sleepScore)) {
    return { restPhrase: "your sleep data isn't in yet", scoreText: null };
  }

  const rounded = Math.round(sleepScore);
  return {
    restPhrase: rounded >= 70 ? "good rest" : "not so much rest",
    scoreText: String(rounded),
  };
}

export function describeRecoveryQuality(recovery: number | null | undefined): string {
  if (recovery == null || Number.isNaN(recovery)) {
    return "unknown";
  }

  const rounded = Math.round(recovery);
  if (rounded >= 67) return "pretty good";
  if (rounded >= 34) return "okay";
  return "pretty low";
}

export function formatIssueCountPhrase(count: number): string {
  if (count === 0) return "nothing due in Linear today";
  if (count === 1) return "1 issue due today";
  return `${count} issues due today`;
}

export function linearIssuesCountToken(count: number): string {
  return `{{linear-issues-count:${count}}}`;
}

export function whoopSleepScoreToken(score: number): string {
  return `{{whoop-sleep-score:${score}}}`;
}

export function whoopRecoveryScoreToken(score: number): string {
  return `{{whoop-recovery-score:${score}}}`;
}

export interface GoodMorningChatResponseInput {
  firstName?: string | null;
  linearIssues: LinearIssueEntity[];
  whoop: WhoopSnapshotEntity | null;
}

export function buildGoodMorningChatResponse(input: GoodMorningChatResponseInput): string {
  const firstName = input.firstName?.trim();
  const greeting = firstName ? `Good morning ${firstName},` : "Good morning,";
  const issueCount = input.linearIssues.length;
  const busyLabel = isBusyDay(issueCount) ? "busy" : "not so busy";
  const sleep = describeSleepRest(input.whoop?.sleepPerformance ?? null);
  const recovery =
    input.whoop?.recoveryScore != null && !Number.isNaN(input.whoop.recoveryScore)
      ? Math.round(input.whoop.recoveryScore)
      : null;

  const issuePhrase =
    issueCount === 0
      ? formatIssueCountPhrase(issueCount)
      : `${linearIssuesCountToken(issueCount)} ${issueCount === 1 ? "issue" : "issues"} due today`;

  const lines = [
    greeting,
    "",
    `I hope you slept well. Today on your plate is a ${busyLabel} day. You have around ${issuePhrase}.`,
  ];

  if (sleep.scoreText) {
    lines.push(
      `It looks like you had ${sleep.restPhrase} — you have a sleep score of ${whoopSleepScoreToken(Number(sleep.scoreText))}.`,
    );
  } else {
    lines.push("It looks like your sleep score isn't available yet.");
  }

  if (sleep.scoreText != null && recovery != null) {
    lines.push(
      `I have updated your journal to contain your sleep score and recovery of ${whoopRecoveryScoreToken(recovery)}.`,
    );
  } else if (recovery != null) {
    lines.push(
      `I have updated your journal with a recovery score of ${whoopRecoveryScoreToken(recovery)}.`,
    );
  } else {
    lines.push("I have updated your journal with this morning's wake time and weather.");
  }

  return lines.join("\n\n");
}
