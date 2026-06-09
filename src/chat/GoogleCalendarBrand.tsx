import { CalendarIcon } from "./CalendarIcon";
import { EntitySourceBrand } from "./EntitySourceBrand";

export function GoogleCalendarBrand() {
  return (
    <EntitySourceBrand
      icon={<CalendarIcon size={14} />}
      label="Google Calendar"
    />
  );
}
