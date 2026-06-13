import type { ChartOptions } from "chart.js";
import type { ChartThemeColors } from "./chartTheme";

export function baseLineChartOptions(theme: ChartThemeColors): ChartOptions<"line"> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: theme.tooltipBg,
        titleColor: theme.text,
        bodyColor: theme.text,
        borderColor: theme.tooltipBorder,
        borderWidth: 1,
        padding: 10,
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
        usePointStyle: true,
      },
      filler: {
        propagate: false,
      },
    },
    scales: {
      x: {
        ticks: {
          color: theme.textMuted,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 12,
          font: { size: 11 },
        },
        grid: {
          color: theme.grid,
          drawOnChartArea: false,
        },
        border: {
          color: theme.grid,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: theme.textMuted,
          maxTicksLimit: 5,
          font: { size: 11 },
        },
        grid: {
          color: theme.grid,
        },
        border: {
          display: false,
        },
      },
    },
    layout: {
      padding: {
        top: 14,
        right: 10,
        bottom: 0,
        left: 6,
      },
    },
    elements: {
      line: {
        tension: 0.35,
        borderWidth: 2,
      },
      point: {
        radius: 3.5,
        hoverRadius: 5,
        hitRadius: 12,
      },
    },
  };
}

export function chartPlotWrapperStyle(height: number): { height: string; minHeight: string } {
  return { height: `${height}px`, minHeight: `${height}px` };
}
