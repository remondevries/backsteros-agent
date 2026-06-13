import type { ScriptableContext } from "chart.js";

function hexWithAlpha(hex: string, alpha: number): string {
  const h = hex.trim();
  if (h.startsWith("rgb")) return h;
  if (!h.startsWith("#")) return h;
  const raw = h.slice(1);
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw.slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return h;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Vertical fill under a line: strong color at the top of the plot, transparent at the baseline. */
export function verticalAreaFillGradient(
  context: ScriptableContext<"line">,
  color: string,
  topAlpha = 0.38,
): CanvasGradient | string {
  const { chart } = context;
  const { ctx, chartArea } = chart;
  if (!chartArea) return hexWithAlpha(color, 0.08);

  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, hexWithAlpha(color, topAlpha));
  gradient.addColorStop(1, hexWithAlpha(color, 0));
  return gradient;
}
