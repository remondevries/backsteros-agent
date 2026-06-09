import { fetchCalendarEventsToday, type TodayCalendarSummary } from "./morning-review-calendar.ts";
import { fetchIssuesDueToday } from "./morning-review-linear.ts";
import { buildMorningReviewOverview } from "./morning-review-overview.ts";
import { fetchMorningReviewWeather, type MorningReviewWeather } from "./morning-review-weather.ts";
import { fetchWhoopTodaySnapshot } from "./morning-review-whoop.ts";
import type { CalendarEventEntity, LinearIssueEntity, WhoopSnapshotEntity } from "./types.ts";

export interface MorningReviewPrefetchResult {
  overview: string;
  linearIssues: LinearIssueEntity[];
  calendar: TodayCalendarSummary;
  whoop: WhoopSnapshotEntity | null;
  weather: MorningReviewWeather | null;
  errors: Partial<Record<"linear" | "calendar" | "whoop" | "weather" | "obsidian", string>>;
}

async function runStep<T>(
  key: keyof MorningReviewPrefetchResult["errors"],
  errors: MorningReviewPrefetchResult["errors"],
  task: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await task();
  } catch (error) {
    errors[key] = error instanceof Error ? error.message : String(error);
    return fallback;
  }
}

export async function prefetchMorningReviewData(): Promise<MorningReviewPrefetchResult> {
  const errors: MorningReviewPrefetchResult["errors"] = {};

  const [linearIssues, calendar, whoop, weather] = await Promise.all([
    runStep("linear", errors, () => fetchIssuesDueToday(), [] as LinearIssueEntity[]),
    runStep("calendar", errors, () => fetchCalendarEventsToday(), {
      events: [] as CalendarEventEntity[],
      firstTimedEvent: null,
    }),
    runStep("whoop", errors, () => fetchWhoopTodaySnapshot({ includeStrainDeepDive: true }), null as WhoopSnapshotEntity | null),
    runStep("weather", errors, () => fetchMorningReviewWeather(), null as MorningReviewWeather | null),
  ]);

  const overview = buildMorningReviewOverview({
    weather,
    whoop,
    calendar,
    linearIssues,
  });

  return {
    overview,
    linearIssues,
    calendar,
    whoop,
    weather,
    errors,
  };
}
