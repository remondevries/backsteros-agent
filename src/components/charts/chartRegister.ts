import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  RadarController,
  RadialLinearScale,
  ScatterController,
  Tooltip,
} from "chart.js";

let registered = false;

/** Register Chart.js components once for the app bundle. */
export function ensureChartJsRegistered(): void {
  if (registered) return;
  Chart.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    LineController,
    BarElement,
    BarController,
    ScatterController,
    RadarController,
    RadialLinearScale,
    Tooltip,
    Legend,
    Filler,
  );
  registered = true;
}
