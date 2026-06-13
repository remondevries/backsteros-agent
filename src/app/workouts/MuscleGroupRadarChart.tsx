import { useMemo, useRef } from "react";
import type { ChartConfiguration } from "chart.js";
import {
  buildMuscleGroupRadarSeries,
  formatMuscleRadarVolumeKg,
  muscleGroupRadarLabels,
  muscleGroupRadarSuggestedMax,
} from "../../lib/workouts/muscleGroupRadar";
import type { MuscleGroupBucket } from "../../lib/workouts/rollups";
import { muscleGroupColor } from "../../lib/workouts/exerciseCatalog";
import { baseLineChartOptions } from "../../components/charts/lineChartDefaults";
import { resolveChartTheme } from "../../components/charts/chartTheme";
import { useChart } from "../../components/charts/useChart";

const RADAR_SIZE_PX = 280;

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return hex;
  return `rgba(${parseInt(m[1]!, 16)}, ${parseInt(m[2]!, 16)}, ${parseInt(m[3]!, 16)}, ${alpha})`;
}

export function MuscleGroupRadarChart({
  buckets,
  muscleLineVisible,
}: {
  buckets: MuscleGroupBucket[];
  muscleLineVisible?: Record<string, boolean>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const labels = useMemo(() => muscleGroupRadarLabels(buckets), [buckets]);
  const series = useMemo(
    () => buildMuscleGroupRadarSeries(labels, buckets),
    [labels, buckets],
  );

  const buildConfig = useMemo(() => {
    return (): ChartConfiguration<"radar"> => {
      const theme = resolveChartTheme(hostRef.current);
      const base = baseLineChartOptions(theme);
      const { values } = series;
      const suggestedMax = muscleGroupRadarSuggestedMax(values);
      const fillColor = hexToRgba(muscleGroupColor("Legs"), 0.22);
      const strokeColor = muscleGroupColor("Legs");

      return {
        type: "radar",
        data: {
          labels,
          datasets: [
            {
              label: "Volume (kg)",
              data: values,
              backgroundColor: fillColor,
              borderColor: strokeColor,
              borderWidth: 2,
              pointBackgroundColor: labels.map((mg) => muscleGroupColor(mg)),
              pointBorderColor: labels.map((mg) => muscleGroupColor(mg)),
              pointRadius: labels.map((mg) => (muscleLineVisible?.[mg] === false ? 2 : 3.5)),
            },
          ],
        },
        options: {
          responsive: base.responsive,
          maintainAspectRatio: false,
          animation: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: true,
              backgroundColor: theme.tooltipBg,
              titleColor: theme.text,
              bodyColor: theme.text,
              borderColor: theme.tooltipBorder,
              borderWidth: 1,
              padding: 10,
              callbacks: {
                label(context) {
                  const idx = context.dataIndex;
                  const mg = labels[idx];
                  const vol = values[idx] ?? 0;
                  const pct =
                    series.totalVolume > 0
                      ? Math.round((vol / series.totalVolume) * 100)
                      : 0;
                  return `${mg}: ${formatMuscleRadarVolumeKg(vol)} (${pct}%)`;
                },
              },
            },
          },
          scales: {
            r: {
              beginAtZero: true,
              suggestedMax,
              ticks: { display: false },
              grid: { color: theme.grid },
              angleLines: { color: theme.grid },
              pointLabels: {
                color: theme.textMuted,
                font: { size: 11 },
              },
            },
          },
        },
      };
    };
  }, [labels, muscleLineVisible, series]);

  const signature = useMemo(
    () => `${series.values.join(",")}:${labels.join("|")}`,
    [labels, series],
  );

  useChart(canvasRef, hostRef, buildConfig, [signature]);

  if (series.totalVolume <= 0) {
    return <div className="workout-chart-empty">No weighted volume in this period yet.</div>;
  }

  return (
    <div
      ref={hostRef}
      className="workout-radar-chart"
      style={{ width: RADAR_SIZE_PX, height: RADAR_SIZE_PX, maxWidth: "100%" }}
    >
      <canvas ref={canvasRef} aria-hidden style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
