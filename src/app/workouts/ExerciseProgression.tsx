import { useMemo, useRef } from "react";
import type { ChartConfiguration } from "chart.js";
import type { ExerciseProgressionPoint } from "../../lib/workouts/rollups";
import { muscleGroupColor } from "../../lib/workouts/exerciseCatalog";
import { baseLineChartOptions, chartPlotWrapperStyle } from "../../components/charts/lineChartDefaults";
import { resolveChartTheme } from "../../components/charts/chartTheme";
import { useChart } from "../../components/charts/useChart";

export type ExerciseProgressionMetric = "topWeight" | "estimated1RM";

export function ExerciseProgression({
  points,
  exercise,
  metric = "topWeight",
  height = 220,
}: {
  points: ExerciseProgressionPoint[];
  exercise: string;
  metric?: ExerciseProgressionMetric;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const color = muscleGroupColor("Legs");

  const buildConfig = useMemo(() => {
    return (): ChartConfiguration<"line"> => {
      const theme = resolveChartTheme(hostRef.current);
      const base = baseLineChartOptions(theme);
      const values = points.map((p) => (metric === "estimated1RM" ? p.estimated1RM : p.topWeight));
      return {
        type: "line",
        data: {
          labels: points.map((p) => p.date),
          datasets: [
            {
              label: exercise,
              data: values,
              borderColor: color,
              backgroundColor: color,
              fill: false,
              pointRadius: 3.5,
            },
          ],
        },
        options: base,
      };
    };
  }, [color, exercise, metric, points]);

  const signature = useMemo(
    () => `${exercise}|${metric}|${points.map((p) => p.date).join(",")}`,
    [exercise, metric, points],
  );

  useChart(canvasRef, hostRef, buildConfig, [signature, height]);

  if (points.length === 0) {
    return <div className="workout-chart-empty">Select an exercise to see progression.</div>;
  }

  return (
    <div ref={hostRef} className="workout-chart-host" style={chartPlotWrapperStyle(height)}>
      <canvas ref={canvasRef} aria-hidden />
    </div>
  );
}
