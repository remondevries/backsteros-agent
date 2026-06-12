export function isDailyVaultNotePath(path: string): boolean {
  return /^Daily\//i.test(path.replace(/\\/g, "/"));
}
