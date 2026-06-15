import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LinearDocumentNoteIcon } from "./LinearDocumentNoteIcon";
import { LINEAR_MEETING_DOCUMENT_ICON } from "../../lib/linearDocumentIcons";

describe("LinearDocumentNoteIcon", () => {
  test("renders meeting calendar icon for Calendar slug", () => {
    const markup = renderToStaticMarkup(
      <LinearDocumentNoteIcon icon={LINEAR_MEETING_DOCUMENT_ICON} />,
    );
    expect(markup).toContain('viewBox="0 0 16 16"');
    expect(markup).toContain("M11 1C13.209 1");
  });

  test("falls back to document icon for unknown slugs", () => {
    const markup = renderToStaticMarkup(<LinearDocumentNoteIcon icon="Initiative" />);
    expect(markup).toContain("M10 1C11.4 1");
  });

  test("renders letter icon when fallback is letter", () => {
    const markup = renderToStaticMarkup(
      <LinearDocumentNoteIcon icon="Initiative" fallback="letter" />,
    );
    expect(markup).toContain("M13.433 7.269");
  });
});
