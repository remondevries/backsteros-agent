import { describe, expect, it } from "bun:test";
import {
  buildGoodNightChatResponse,
  buildGoodNightReflectionResponse,
  describeStrainFollowUp,
  isBusyDay,
  isProductiveDay,
} from "./good-night-response.ts";

describe("good-night-response", () => {
  it("builds the evening summary with inline tokens", () => {
    const text = buildGoodNightChatResponse({
      firstName: "Remon",
      movedIssueCount: 23,
      completedIssueCount: 24,
      productivityScore: 9,
      whoop: {
        id: "whoop-2026-06-08",
        date: "2026-06-08",
        strainScore: 3.4,
        sleepDuration: "5:21",
        strainTarget: {
          value: 8.4,
          optimalLower: 6,
          optimalUpper: 10,
        },
      },
    });

    expect(text).toContain("Good evening, Remon,");
    expect(text).toContain("busy day");
    expect(text).toContain("{{linear-completed-count:24}}");
    expect(text).toContain("which is a solid result.");
    expect(text).toContain("{{linear-moved-count:23}}");
    expect(text).toContain("{{whoop-strain-target:8.4}}");
    expect(text).toContain("{{whoop-strain-score:3.4}}");
    expect(text).toContain("there's room to push a bit harder tomorrow");
    expect(text).toContain("{{whoop-sleep-duration:5:21}}");
    expect(text).toContain("aim for at least 2 more hours tonight");
    expect(text).toContain("Before you sign off, I have a few questions");
  });

  it("handles quiet days without moved issues", () => {
    const text = buildGoodNightChatResponse({
      firstName: "Remon",
      movedIssueCount: 0,
      completedIssueCount: 0,
      productivityScore: 2,
      whoop: null,
    });

    expect(text).toContain("didn't close out any Linear issues");
    expect(text).toContain("Nothing was left to move to tomorrow");
  });

  it("classifies productivity and strain follow-ups", () => {
    expect(isProductiveDay(5)).toBe(true);
    expect(isProductiveDay(4)).toBe(false);
    expect(isBusyDay(3, 1)).toBe(true);
    expect(
      describeStrainFollowUp(3.4, {
        value: 8.4,
        optimalLower: 6,
        optimalUpper: 10,
      }),
    ).toContain("there's room to push a bit harder tomorrow");
  });

  it("builds the journal confirmation token", () => {
    const response = buildGoodNightReflectionResponse();
    expect(response).toContain("{{update:reflection|journal|");
    expect(response).toContain("Thanks for your answers");
    expect(response).toContain("Get some good rest");
  });
});
