/**
 * Stable colors for category / muscle-group chart swatches.
 * Tuned for dark UI: each label has a unique hue with enough perceptual separation.
 */

/** First dot set — expense leaves (subset used by workouts muscle-group colors). */
export const CATEGORY_DOT_PALETTE = [
  '#3355FF',
  '#BF6516',
  '#D06670',
  '#FFFFFF',
  '#64748B',
  '#6D83E1',
  '#E033D0',
  '#52B788',
  '#95A5A6',
  '#E68A2E',
  '#16A085',
  '#F1C40F',
  '#C0392B',
  '#3498DB',
] as const;

/** Fills that disappear on the UI surface without a hairline edge (not saturated hues). */
const LIGHT_SWATCH_FILLS = new Set(
  ['#ffffff', '#cbd5e1', '#c9a9a6', '#95a5a6'].map((h) => h.toLowerCase()),
);

/** True when a swatch needs a stronger edge (white / pale gray only). */
export function categorySwatchNeedsBorder(fill: string): boolean {
  return LIGHT_SWATCH_FILLS.has(fill.trim().toLowerCase());
}

/** Swatch / legend-dot class names (adds `is-light` when the fill needs a visible edge). */
export function categorySwatchClassName(
  fill: string,
  variant: 'swatch' | 'donut' = 'swatch',
  extra?: string,
): string {
  const base =
    variant === 'donut'
      ? 'backsteros-financials-donut-legend-dot'
      : 'backsteros-financials-category-swatch';
  const light = categorySwatchNeedsBorder(fill) ? ' is-light' : '';
  return [base + light, extra].filter(Boolean).join(' ');
}
