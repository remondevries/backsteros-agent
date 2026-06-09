import { CalendarCreatedEventIcon } from "./CalendarCreatedEventIcon";
import { MeetingNoteIcon } from "./VaultNoteIcon";
import { openExternalUrl } from "../lib/openExternalUrl";
import type { CalendarEventEntity } from "./types";

function formatEventTime(item: CalendarEventEntity): string {
  if (item.start && item.end) {
    return `${item.start} – ${item.end}`;
  }
  return item.start ?? item.end ?? "All day";
}

export function CalendarEventRow({ item }: { item: CalendarEventEntity }) {
  const row = (
    <>
      <span className="calendar-event-icon">
        {item.created ? (
          <CalendarCreatedEventIcon size={16} color={item.calendarColor} />
        ) : (
          <MeetingNoteIcon size={16} color={item.calendarColor} />
        )}
      </span>
      <span className="calendar-event-time">{formatEventTime(item)}</span>
      <span className="calendar-event-title">{item.title}</span>
      {item.calendarName && (
        <span className="calendar-event-calendar">{item.calendarName}</span>
      )}
    </>
  );

  if (item.url) {
    return (
      <a
        className="entity-row calendar-event-row"
        href={item.url}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => {
          event.preventDefault();
          void openExternalUrl(item.url!);
        }}
      >
        {row}
      </a>
    );
  }

  return <div className="entity-row calendar-event-row">{row}</div>;
}
