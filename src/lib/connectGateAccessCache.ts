const CONNECT_GATE_ACCESS_CACHE_KEY = "backsteros.connectGate.accessGranted";

export function isConnectGateAccessCached(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(CONNECT_GATE_ACCESS_CACHE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeConnectGateAccessCache(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CONNECT_GATE_ACCESS_CACHE_KEY, "1");
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function clearConnectGateAccessCache(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(CONNECT_GATE_ACCESS_CACHE_KEY);
  } catch {
    // Ignore.
  }
}
