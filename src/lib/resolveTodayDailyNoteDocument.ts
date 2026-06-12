import { ensureVaultDailyNoteToday, fetchVaultDailyNoteToday } from "./api";
import type { ActiveVaultDocument } from "../app/contentPanelNavigation";

export async function resolveTodayDailyNoteDocument(): Promise<ActiveVaultDocument | null> {
  const result = await fetchVaultDailyNoteToday();
  if (result.note.exists) {
    return {
      path: result.note.path,
      title: result.note.date,
    };
  }

  const ensured = await ensureVaultDailyNoteToday();
  if (!ensured.note) {
    return null;
  }

  return {
    path: ensured.note.path,
    title: ensured.note.date,
  };
}
