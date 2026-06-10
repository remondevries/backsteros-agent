import { GeminiIcon } from "../chat/GeminiIcon";
import { EntitySourceBrand } from "../chat/EntitySourceBrand";

export function GeminiBrand() {
  return (
    <EntitySourceBrand
      icon={<GeminiIcon size={14} />}
      label="Gemini"
    />
  );
}

export function GeminiBrandHeader() {
  return (
    <div className="run-entity-brands">
      <GeminiBrand />
    </div>
  );
}
