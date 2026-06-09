import { EntitySourceBrand } from "./EntitySourceBrand";
import { ObsidianIcon } from "./ObsidianIcon";

export function ObsidianBrand() {
  return (
    <EntitySourceBrand
      icon={<ObsidianIcon size={14} />}
      label="Obsidian"
    />
  );
}
