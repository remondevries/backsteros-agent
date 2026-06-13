import { useRef } from "react";
import type { ChartConfiguration } from "chart.js";
import { useChart } from "./useChart";

interface ChartProps {
  buildConfig: () => ChartConfiguration<"line" | "bar" | "scatter" | "radar">;
  deps: readonly unknown[];
  className?: string;
  height?: number;
}

export function Chart({ buildConfig, deps, className, height = 220 }: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);

  useChart(canvasRef, hostRef, buildConfig, deps);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ height: `${height}px`, minHeight: `${height}px`, position: "relative" }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
