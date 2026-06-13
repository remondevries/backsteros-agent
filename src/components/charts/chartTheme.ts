export interface ChartThemeColors {
  text: string;
  textMuted: string;
  grid: string;
  positive: string;
  negative: string;
  tooltipBg: string;
  tooltipBorder: string;
}

function readCssVar(el: HTMLElement, name: string, fallback: string): string {
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  return value || fallback;
}

/** Resolve chart colors from app CSS variables on a host element. */
export function resolveChartTheme(host: HTMLElement | null): ChartThemeColors {
  const el = host ?? document.body;
  const grid = readCssVar(el, "--border-subtle", "rgba(255, 255, 255, 0.12)");
  return {
    text: readCssVar(el, "--text-primary", "#dcddde"),
    textMuted: readCssVar(el, "--text-faint", "#999"),
    grid,
    positive: readCssVar(el, "--settings-connection-dot", "#39c53b"),
    negative: readCssVar(el, "--danger-text", "#eb5757"),
    tooltipBg: readCssVar(el, "--surface-elevated", "rgba(0, 0, 0, 0.85)"),
    tooltipBorder: readCssVar(el, "--border-subtle", grid),
  };
}
