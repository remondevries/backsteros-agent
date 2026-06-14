import { describe, expect, test } from "bun:test";
import {
  abbreviateGithubLabelName,
  githubLabelHoverTitle,
} from "./linearLabelDisplay";

describe("abbreviateGithubLabelName", () => {
  test("shortens GitHub repo URLs to owner/repo", () => {
    expect(abbreviateGithubLabelName("https://github.com/acme/widget")).toBe("acme/widget");
    expect(abbreviateGithubLabelName("http://www.github.com/acme/widget")).toBe("acme/widget");
    expect(abbreviateGithubLabelName("https://github.com/acme/widget/")).toBe("acme/widget");
    expect(abbreviateGithubLabelName("github.com/acme/widget")).toBe("acme/widget");
  });

  test("ignores extra path segments after owner/repo", () => {
    expect(abbreviateGithubLabelName("https://github.com/acme/widget/tree/main")).toBe(
      "acme/widget",
    );
    expect(abbreviateGithubLabelName("https://github.com/acme/widget/issues/42")).toBe(
      "acme/widget",
    );
    expect(abbreviateGithubLabelName("github.com/acme/widget/issues/42")).toBe("acme/widget");
  });

  test("strips .git suffix from repo name", () => {
    expect(abbreviateGithubLabelName("https://github.com/acme/widget.git")).toBe("acme/widget");
    expect(abbreviateGithubLabelName("github.com/acme/widget.git")).toBe("acme/widget");
  });

  test("extracts embedded GitHub URLs from surrounding text", () => {
    expect(abbreviateGithubLabelName("Repo: https://github.com/acme/widget")).toBe("acme/widget");
  });

  test("leaves non-GitHub labels unchanged", () => {
    expect(abbreviateGithubLabelName("Bug")).toBe("Bug");
    expect(abbreviateGithubLabelName("https://gitlab.com/acme/widget")).toBe(
      "https://gitlab.com/acme/widget",
    );
  });

  test("keeps full label text for hover titles when abbreviated", () => {
    expect(githubLabelHoverTitle("https://github.com/acme/widget")).toBe(
      "https://github.com/acme/widget",
    );
    expect(githubLabelHoverTitle("Bug")).toBe("Bug");
  });
});
