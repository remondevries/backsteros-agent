import { describe, expect, test } from "bun:test";
import {
  notifyLinearDocumentListChange,
  onLinearDocumentListChange,
} from "./linearDocumentListEvents";

describe("linearDocumentListEvents", () => {
  test("notifies listeners with update and remove changes", () => {
    const changes: string[] = [];

    const unsubscribe = onLinearDocumentListChange((change) => {
      if (change.type === "update") {
        changes.push(`update:${change.linearDocumentId}:${change.patch.title ?? ""}`);
        return;
      }
      changes.push(`remove:${change.linearDocumentId}`);
    });

    notifyLinearDocumentListChange({
      type: "update",
      linearDocumentId: "doc-1",
      patch: {
        title: "Renamed",
        projectId: "project-1",
        organization: "Engineering",
      },
    });
    notifyLinearDocumentListChange({ type: "remove", linearDocumentId: "doc-2" });

    unsubscribe();

    notifyLinearDocumentListChange({
      type: "update",
      linearDocumentId: "doc-3",
      patch: { title: "Ignored" },
    });

    expect(changes).toEqual(["update:doc-1:Renamed", "remove:doc-2"]);
  });
});
