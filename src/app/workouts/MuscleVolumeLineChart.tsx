import { useMemo, useRef } from "react";
import type { ChartConfiguration } from "chart.js";
import { formatMonthShort } from "../../lib/dateFormat";
import type { MuscleVolumeLineSeries } from "../../lib/workouts/chartSeries";
import { muscleGroupColor } from "../../lib/workouts/exerciseCatalog";
import { baseLineChartOptions, chartPlotWrapperStyle } from "../../components/charts/lineChartDefaults";
import { resolveChartTheme } from "../../components/charts/chartTheme";
import { useChart } from "../../components/charts/useChart";

function formatVolumeAxis(kg: number): string {
  if (!Number.isFinite(kg) || kg === 0) return "0";
  if (kg < 1000) return `${Math.round(kg)}`;
  return `${(kg / 1000).toFixed(1)}k`;
}

function formatVolumeTooltip(kg: number): string {
  if (!Number.isFinite(kg)) return "";
  if (kg < 1000) return `${Math.round(kg)} kg`;
  return `${(kg / 1000).toFixed(1)}k kg`;
}

export function MuscleVolumeLineChart({
  series,
  muscleGroups,
  muscleLineVisible,
  height = 220,
}: {
  series: MuscleVolumeLineSeries;
  muscleGroups: string[];
  muscleLineVisible?: Record<string, boolean>;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);

  const hasData = useMemo(() => {
    for (const mg of muscleGroups) {
      const values = series.byMuscle.get(mg) ?? [];
      if (values.some((v) => v != null && v > 0)) return true;
    }
    return false;
  }, [muscleGroups, series.byMuscle]);

  const buildConfig = useMemo(() => {
    return (): ChartConfiguration<"line"> => {
      const theme = resolveChartTheme(hostRef.current);
      const base = baseLineChartOptions(theme);
      return {
        type: "line",
        data: {
          labels: series.labels,
          datasets: muscleGroups.map((mg) => {
            const color = muscleGroupColor(mg);
            return {
              label: mg,
              data: series.byMuscle.get(mg) ?? [],
              hidden: muscleLineVisible?.[mg] === false,
              spanGaps: false,
              borderColor: color,
              backgroundColor: color,
              fill: false,
              pointRadius: 3.5,
              pointHoverRadius: 5,
              pointBackgroundColor: color,
              pointBorderColor: color,
            };
          }),
        },
        options: {
          ...base,
          plugins: {
            ...base.plugins,
            tooltip: {
              ...base.plugins?.tooltip,
              callbacks: {
                title(context) {
                  const idx = context[0]?.dataIndex;
                  if (idx == null) return "";
                  const key = series.keys[idx];
                  if (!key) return "";
                  return series.granularity === "month" ? formatMonthShort(key) : key;
                },
                label(context) {
                  const value = context.parsed.y;
                  if (value == null || !Number.isFinite(value)) return "";
                  return `${context.dataset.label}: ${formatVolumeTooltip(value)}`;
                },
              },
            },
          },
          scales: {
            ...base.scales,
            y: {
              ...base.scales?.y,
              ticks: {
                ...base.scales?.y?.ticks,
                callback(tickValue) {
                  const n = typeof tickValue === "number" ? tickValue : Number(tickValue);
                  return Number.isFinite(n) ? formatVolumeAxis(n) : "";
                },
              },
            },
          },
        },
      };
    };
  }, [series, muscleGroups, muscleLineVisible]);

  const signature = useMemo(
    () =>
      `${series.labels.join("|")}|${muscleGroups.map((mg) => (series.byMuscle.get(mg) ?? []).join(",")).join(";")}`,
    [series, muscleGroups],
  );

  useChart(canvasRef, hostRef, buildConfig, [signature, height]);

  if (!hasData) {
    return <div className="workout-chart-empty">No volume data yet.</div>;
  }

  return (
    <div ref={hostRef} className="workout-chart-host" style={chartPlotWrapperStyle(height)}>
      <canvas ref={canvasRef} aria-hidden />
    </div>
  );
}
