export type ProductMode = "linear" | "full";

export function getProductMode(): ProductMode {
  const mode = import.meta.env.VITE_PRODUCT_MODE?.trim().toLowerCase();
  return mode === "full" ? "full" : "linear";
}

export function isVaultProductMode(): boolean {
  return getProductMode() === "full";
}

export function isLinearProductMode(): boolean {
  return !isVaultProductMode();
}
