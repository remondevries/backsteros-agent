import { describe, expect, it } from "bun:test";
import {
  formatLinearTeamLabel,
  formatUnsetTeamSelection,
  resolveLinearTeam,
  resolveLinearTeamLabel,
} from "./linearTeamDisplay";

describe("linearTeamDisplay", () => {
  const teams = [
    { id: "team-1", key: "ENG", name: "Engineering" },
    { id: "team-2", key: "OPS", name: "Operations" },
  ];

  it("formats team labels with name only", () => {
    expect(formatLinearTeamLabel(teams[0])).toBe("Engineering");
  });

  it("resolves team labels from ids", () => {
    expect(resolveLinearTeamLabel("team-2", teams)).toBe("Operations");
    expect(resolveLinearTeamLabel("missing", teams)).toBeNull();
  });

  it("resolves teams by id", () => {
    expect(resolveLinearTeam("team-1", teams)?.name).toBe("Engineering");
    expect(resolveLinearTeam("", teams)).toBeNull();
  });

  it("formats unset selection", () => {
    expect(formatUnsetTeamSelection()).toBe("Not selected");
  });
});
