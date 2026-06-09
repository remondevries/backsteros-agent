import { loadUserFirstName } from "./context/profile.ts";
import type { CalendarEventEntity, LinearIssueEntity, WhoopSnapshotEntity } from "./types.ts";
import type { MorningReviewWeather } from "./morning-review-weather.ts";
import { formatWeatherLine } from "./morning-review-weather.ts";
import type { TodayCalendarSummary } from "./morning-review-calendar.ts";

export interface MorningReviewOverviewInput {
  weather: MorningReviewWeather | null;
  whoop: WhoopSnapshotEntity | null;
  calendar: TodayCalendarSummary;
  linearIssues: LinearIssueEntity[];
}

function recoveryGuidance(whoop: WhoopSnapshotEntity | null): string {
  if (!whoop) {
    return "Recovery data is not available yet.";
  }

  const score =
    whoop.recoveryScore != null ? `${Math.round(whoop.recoveryScore)}% recovery` : "recovery";

  if (whoop.recoveryState === "GREEN") {
    return `You're cleared for a full training day because ${score} is in the green.`;
  }
  if (whoop.recoveryState === "YELLOW") {
    return `Moderate activity fits best today with ${score} in the yellow.`;
  }
  if (whoop.recoveryState === "RED") {
    return `Prioritize rest and keep strain low today with ${score} in the red.`;
  }

  if (whoop.recoveryScore != null && whoop.recoveryScore >= 67) {
    return `You're in good shape today with ${score}.`;
  }
  if (whoop.recoveryScore != null && whoop.recoveryScore >= 34) {
    return `Take a balanced approach today with ${score}.`;
  }
  if (whoop.recoveryScore != null) {
    return `Take it easy today with ${score}.`;
  }

  return "Use your recovery score to gauge how hard to push today.";
}

function sleepLine(whoop: WhoopSnapshotEntity | null): string {
  if (!whoop) {
    return "Whoop sleep data is not available yet.";
  }

  const parts: string[] = [];
  if (whoop.sleepDuration) {
    parts.push(`You slept ${whoop.sleepDuration}`);
  }
  if (whoop.sleepPerformance != null) {
    parts.push(`${Math.round(whoop.sleepPerformance)}% sleep performance`);
  }

  if (parts.length === 0) {
    return "Whoop sleep data is not available yet.";
  }

  return `${parts.join(" with ")} (Whoop).`;
}

function appointmentLine(calendar: TodayCalendarSummary): string {
  if (calendar.firstTimedEvent) {
    return `Your first appointment today is at ${calendar.firstTimedEvent.timeLabel}: ${calendar.firstTimedEvent.title}.`;
  }

  if (calendar.events.length > 0) {
    const first = calendar.events[0];
    return `You have ${calendar.events.length} event${calendar.events.length === 1 ? "" : "s"} today. The first is ${first.title}.`;
  }

  return "Nothing scheduled on your calendar today.";
}

function linearLine(count: number): string {
  if (count === 0) {
    return "It's a lighter day with nothing due in Linear today.";
  }
  if (count === 1) {
    return "You have 1 Linear issue due today.";
  }
  if (count <= 3) {
    return `It's a manageable day with ${count} Linear issues due today.`;
  }
  return `It's a busy day with ${count} Linear issues due today.`;
}

export function buildMorningReviewOverview(input: MorningReviewOverviewInput): string {
  const firstName = loadUserFirstName();
  const greeting = firstName ? `Good morning, ${firstName}.` : "Good morning.";

  return [
    greeting,
    formatWeatherLine(input.weather),
    sleepLine(input.whoop),
    recoveryGuidance(input.whoop),
    appointmentLine(input.calendar),
    linearLine(input.linearIssues.length),
  ].join("\n\n");
}
