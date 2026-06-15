export const CONNECT_GATE_CURSOR_QUERY = "connect";
export const CONNECT_GATE_CURSOR_VALUE = "cursor";
export const CONNECT_GATE_SETUP_VALUE = "setup";

export type ConnectGateReturnParams = {
  cursorStep: boolean;
  setupStep: boolean;
};

/** Read and strip connect-gate query params from the current URL. */
export function readConnectGateReturnParams(): ConnectGateReturnParams {
  const params = new URLSearchParams(window.location.search);
  const cursorStep = params.get(CONNECT_GATE_CURSOR_QUERY) === CONNECT_GATE_CURSOR_VALUE;
  const setupStep = params.get(CONNECT_GATE_CURSOR_QUERY) === CONNECT_GATE_SETUP_VALUE;

  if (cursorStep || setupStep) {
    const url = new URL(window.location.href);
    url.searchParams.delete(CONNECT_GATE_CURSOR_QUERY);
    const next =
      url.pathname +
      (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "") +
      url.hash;
    window.history.replaceState(null, "", next);
  }

  return { cursorStep, setupStep };
}
