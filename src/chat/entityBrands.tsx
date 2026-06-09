import type { StructuredPayload } from "./types";
import { GoogleCalendarBrand } from "./GoogleCalendarBrand";
import { LinearBrand } from "./LinearBrand";
import { ObsidianBrand } from "./ObsidianBrand";

export function isTableEntity(payload: StructuredPayload): boolean {
  return (
    payload.type === "linear_issues" ||
    payload.type === "calendar_events" ||
    payload.type === "markdown_files"
  );
}

export function EntityBrand({ payload }: { payload: StructuredPayload }) {
  if (payload.type === "linear_issues") {
    return <LinearBrand />;
  }

  if (payload.type === "calendar_events") {
    return <GoogleCalendarBrand />;
  }

  if (payload.type === "markdown_files") {
    return <ObsidianBrand />;
  }

  return null;
}

export function collectTableEntityBrands(entities: StructuredPayload[]): StructuredPayload[] {
  const brands: StructuredPayload[] = [];
  const seen = new Set<StructuredPayload["type"]>();

  for (const entity of entities) {
    if (!isTableEntity(entity) || seen.has(entity.type)) continue;
    seen.add(entity.type);
    brands.push(entity);
  }

  return brands;
}
