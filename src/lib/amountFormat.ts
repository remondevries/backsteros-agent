/** Round to 2 decimals, avoiding the classic `0.1 + 0.2` floating-point trap. */
export function round2(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}
