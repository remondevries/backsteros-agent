import { EntitySourceBrand } from "./EntitySourceBrand";
import { LinearIcon } from "./LinearIcon";

export function LinearUrgentIssuesHeader() {
  return (
    <EntitySourceBrand
      icon={<LinearIcon size={14} />}
      label="Urgent issues for today"
      uppercase={false}
    />
  );
}
