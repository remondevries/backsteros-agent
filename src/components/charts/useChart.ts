import { useLayoutEffect, useRef, type RefObject } from "react";
import { Chart, type ChartConfiguration } from "chart.js";
import { ensureChartJsRegistered } from "./chartRegister";

const MIN_CHART_PX = 32;

function hostReady(host: HTMLElement | null, canvas: HTMLCanvasElement): boolean {
  const el = host ?? canvas.parentElement;
  if (!el) return false;
  return el.clientWidth >= MIN_CHART_PX && el.clientHeight >= MIN_CHART_PX;
}

function waitForHostSize(
  host: HTMLElement | null,
  canvas: HTMLCanvasElement,
  onReady: () => void,
  attempt = 0,
): void {
  if (hostReady(host, canvas) || attempt > 60) {
    onReady();
    return;
  }
  requestAnimationFrame(() => waitForHostSize(host, canvas, onReady, attempt + 1));
}

/**
 * Mount and update a Chart.js instance on a canvas ref.
 * Destroys on unmount; resizes when the host element changes size.
 */
export function useChart(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  hostRef: RefObject<HTMLElement | null>,
  buildConfig: () => ChartConfiguration<"line" | "bar" | "scatter" | "radar">,
  deps: readonly unknown[],
): void {
  const chartRef = useRef<Chart | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const mountGenerationRef = useRef(0);

  useLayoutEffect(() => {
    ensureChartJsRegistered();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const config = buildConfig();

    if (chartRef.current) {
      chartRef.current.data = config.data;
      if (config.options) {
        chartRef.current.options = config.options;
      }
      chartRef.current.update("none");
      return;
    }

    const gen = ++mountGenerationRef.current;
    const pendingConfig = config;

    const mountChart = (): void => {
      if (mountGenerationRef.current !== gen || chartRef.current || !canvasRef.current) return;
      if (!hostReady(hostRef.current, canvas)) return;

      chartRef.current = new Chart(canvas, pendingConfig);

      if (!resizeObserverRef.current) {
        const ro = new ResizeObserver(() => {
          chartRef.current?.resize();
        });
        resizeObserverRef.current = ro;
        const host = hostRef.current ?? canvas.parentElement;
        if (host) ro.observe(host);
      }
    };

    waitForHostSize(hostRef.current, canvas, mountChart);
  }, deps);

  useLayoutEffect(() => {
    return () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, []);
}
