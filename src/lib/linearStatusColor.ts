import { splashThemeFromPrefersColorScheme, type SplashTheme } from "./splashBackground";

export type LinearStatusOklch = {
  l: number;
  c: number;
  h: number;
};

export type LinearStatusColorScheme = SplashTheme;

const OKLCH_CSS_PATTERN =
  /^oklch\(\s*([0-9.]+%?)\s+([0-9.]+)\s+([0-9.]+)(?:deg|)\s*(?:\/\s*[0-9.]+%?)?\s*\)$/i;

const LCH_CSS_PATTERN =
  /^lch\(\s*([0-9.]+%?)\s+([0-9.]+)\s+([0-9.]+)(?:deg|)\s*(?:\/\s*[0-9.]+%?)?\s*\)$/i;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parsePercent(value: string): number {
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) {
    return Number(trimmed.slice(0, -1)) / 100;
  }
  return Number(trimmed);
}

function linearizeChannel(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function parseHexColor(input: string): { r: number; g: number; b: number } | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/);
  if (!match) return null;

  const hex = match[1]!;
  if (hex.length === 3) {
    const r = Number.parseInt(hex[0]! + hex[0]!, 16);
    const g = Number.parseInt(hex[1]! + hex[1]!, 16);
    const b = Number.parseInt(hex[2]! + hex[2]!, 16);
    return { r: r / 255, g: g / 255, b: b / 255 };
  }

  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return { r: r / 255, g: g / 255, b: b / 255 };
}

function rgbToOklab(r: number, g: number, b: number): { L: number; a: number; b: number } {
  const lr = linearizeChannel(r);
  const lg = linearizeChannel(g);
  const lb = linearizeChannel(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  return {
    L: 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot,
    a: 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot,
    b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot,
  };
}

function oklabToOklch(L: number, a: number, b: number): LinearStatusOklch {
  const c = Math.sqrt(a * a + b * b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  if (c < 0.0001) h = 0;
  return { l: L, c, h };
}

function rgbToOklch(r: number, g: number, b: number): LinearStatusOklch {
  const lab = rgbToOklab(r, g, b);
  return oklabToOklch(lab.L, lab.a, lab.b);
}

/** CIELAB LCH → OKLCH (for rare non-hex inputs). */
function labLchToOklch(lStar: number, c: number, hDeg: number): LinearStatusOklch {
  const hRad = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l = (lStar + 16) / 116;
  const m = l - b / 200;
  const s = l - a / 500;

  const lCube = l ** 3;
  const mCube = m ** 3;
  const sCube = s ** 3;

  const lr = 0.4122214708 * lCube + 0.5363325363 * mCube + 0.0514459929 * sCube;
  const lg = 0.2119034982 * lCube + 0.6806995451 * mCube + 0.1073969566 * sCube;
  const lb = 0.0883024619 * lCube + 0.2817188376 * mCube + 0.6299787005 * sCube;

  const r = lr <= 0.0031308 ? 12.92 * lr : 1.055 * lr ** (1 / 2.4) - 0.055;
  const g = lg <= 0.0031308 ? 12.92 * lg : 1.055 * lg ** (1 / 2.4) - 0.055;
  const bChannel = lb <= 0.0031308 ? 12.92 * lb : 1.055 * lb ** (1 / 2.4) - 0.055;

  return rgbToOklch(r, g, bChannel);
}

export function formatLinearStatusOklch(color: LinearStatusOklch): string {
  const l = color.l.toFixed(3);
  const c = color.c.toFixed(3);
  const h = color.h.toFixed(1);
  return `oklch(${l} ${c} ${h})`;
}

export function parseLinearStatusColor(input?: string | null): LinearStatusOklch | null {
  const trimmed = input?.trim();
  if (!trimmed) return null;

  const hexRgb = parseHexColor(trimmed);
  if (hexRgb) {
    return rgbToOklch(hexRgb.r, hexRgb.g, hexRgb.b);
  }

  const oklchMatch = trimmed.match(OKLCH_CSS_PATTERN);
  if (oklchMatch) {
    return {
      l: parsePercent(oklchMatch[1]!),
      c: Number(oklchMatch[2]!),
      h: Number(oklchMatch[3]!),
    };
  }

  const lchMatch = trimmed.match(LCH_CSS_PATTERN);
  if (lchMatch) {
    return labLchToOklch(parsePercent(lchMatch[1]!), Number(lchMatch[2]!), Number(lchMatch[3]!));
  }

  return null;
}

/** Linear-style UI tuning: keep hue/chroma, adjust lightness per theme. */
export function adaptLinearStatusOklch(
  color: LinearStatusOklch,
  colorScheme: LinearStatusColorScheme,
): LinearStatusOklch {
  const neutral = color.c < 0.02;

  if (colorScheme === "dark") {
    if (neutral) {
      return { ...color, l: clamp(Math.max(color.l, 0.72), 0, 1), c: color.c };
    }
    if (color.l < 0.62) {
      return { ...color, l: clamp(color.l + (0.68 - color.l) * 0.4, 0, 1) };
    }
    if (color.l > 0.9) {
      return { ...color, l: clamp(color.l - 0.05, 0, 1) };
    }
    return color;
  }

  if (neutral && color.l > 0.86) {
    return { ...color, l: clamp(color.l - 0.1, 0, 1) };
  }
  if (color.l > 0.93) {
    return { ...color, l: clamp(color.l - 0.04, 0, 1) };
  }
  return color;
}

const DEFAULT_OKLCH: Record<string, LinearStatusOklch> = {
  triage: { l: 0.696, c: 0.202, h: 42.2 },
  backlog: { l: 0.813, c: 0.01, h: 258.3 },
  completed: { l: 0.571, c: 0.17, h: 274.4 },
  unstarted: { l: 0.913, c: 0, h: 0 },
  started: { l: 0.831, c: 0.17, h: 85.0 },
  canceled: { l: 0.913, c: 0, h: 0 },
};

export function resolveLinearStatusColorScheme(
  colorScheme?: LinearStatusColorScheme,
): LinearStatusColorScheme {
  return colorScheme ?? splashThemeFromPrefersColorScheme();
}

export function subscribeToPreferredColorScheme(onStoreChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => {};
  }

  const media = window.matchMedia("(prefers-color-scheme: light)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

export function getPreferredColorSchemeSnapshot(): LinearStatusColorScheme {
  return splashThemeFromPrefersColorScheme();
}

export function resolveLinearStatusColor(
  stateType: string,
  statusColor?: string,
  options?: { colorScheme?: LinearStatusColorScheme },
): string {
  const normalizedType = stateType.trim().toLowerCase() || "started";
  const scheme = resolveLinearStatusColorScheme(options?.colorScheme);
  const parsed = parseLinearStatusColor(statusColor);
  const base = parsed ?? DEFAULT_OKLCH[normalizedType] ?? DEFAULT_OKLCH.started!;
  const adapted = adaptLinearStatusOklch(base, scheme);
  return formatLinearStatusOklch(adapted);
}
