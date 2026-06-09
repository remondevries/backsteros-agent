import { EntitySourceBrand } from "./EntitySourceBrand";
import { LinearIcon } from "./LinearIcon";

export function LinearCompletedIssuesHeader() {
  return (
    <EntitySourceBrand
      icon={<LinearIcon size={14} />}
      label="Completed today"
      uppercase={false}
    />
  );
}
