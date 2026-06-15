import { useSyncExternalStore } from "react";
import {
  computeLinearProjectStatusIconModel,
  describeLinearProjectCompletedCheckTransform,
  describeLinearProjectStatusHexagonPath,
  describeLinearProjectStatusPieWedge,
  LINEAR_PROJECT_COMPLETED_CHECK_PATH,
  type LinearProjectStatusForIcon,
} from "../lib/linearProjectStatusIcon";
import {
  getPreferredColorSchemeSnapshot,
  subscribeToPreferredColorScheme,
} from "../lib/linearStatusColor";
import { LINEAR_STATUS_RING_STROKE_WIDTH } from "../lib/linearStatusIcon";

export type { LinearProjectStatusForIcon } from "../lib/linearProjectStatusIcon";

function CompletedHexIcon({ color }: { color: string }) {
  return (
    <>
      <path d={describeLinearProjectStatusHexagonPath()} fill={color} />
      <g transform={describeLinearProjectCompletedCheckTransform()}>
        <path className="linear-project-status-icon__check" d={LINEAR_PROJECT_COMPLETED_CHECK_PATH} />
      </g>
    </>
  );
}

function ProgressHexagonIcon({ color, fillRatio }: { color: string; fillRatio: number }) {
  const wedgePath = describeLinearProjectStatusPieWedge(fillRatio);
  const hexOutlinePath = describeLinearProjectStatusHexagonPath();

  return (
    <>
      {wedgePath ? <path d={wedgePath} fill={color} /> : null}
      <path
        d={hexOutlinePath}
        fill="none"
        stroke={color}
        strokeWidth={LINEAR_STATUS_RING_STROKE_WIDTH}
        strokeLinejoin="round"
      />
    </>
  );
}

export function LinearProjectStatusIcon({
  status,
  stateType,
  stateId,
  statusColor,
  statusPosition,
  projectStatuses,
  title,
}: {
  status?: string;
  stateType?: string;
  stateId?: string | null;
  statusColor?: string;
  statusPosition?: number;
  projectStatuses?: LinearProjectStatusForIcon[];
  title?: string;
}) {
  const colorScheme = useSyncExternalStore(
    subscribeToPreferredColorScheme,
    getPreferredColorSchemeSnapshot,
    () => "dark" as const,
  );
  const model = computeLinearProjectStatusIconModel({
    status,
    stateType,
    stateId,
    statusColor,
    statusPosition,
    projectStatuses,
    colorScheme,
  });
  const label = status ?? stateType ?? "Unknown status";

  return (
    <svg
      className="linear-project-status-icon"
      data-color-scheme={colorScheme}
      viewBox="0 0 14 14"
      width="14"
      height="14"
      aria-hidden={title ? undefined : true}
      aria-label={title ? undefined : label}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {model.kind === "completed" ? <CompletedHexIcon color={model.color} /> : null}
      {model.kind === "hexagon" ? (
        <ProgressHexagonIcon color={model.color} fillRatio={model.fillRatio} />
      ) : null}
    </svg>
  );
}
