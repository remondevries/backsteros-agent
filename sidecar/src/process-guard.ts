/**
 * Kokoro's phonemizer (an Emscripten/WASM module) installs process-level
 * "unhandledRejection" and "uncaughtException" listeners that RE-THROW every
 * error they receive. That turns the Cursor SDK's benign
 * NGHTTP2_FRAME_SIZE_ERROR stream rejection into a fatal uncaught exception
 * that crashes the sidecar mid-run.
 *
 * This module patches the process listener-registration methods so that any
 * listener added for those two events is wrapped in a try/catch. The wrapper
 * lets the listener run but neutralizes its re-throw, so a benign rejection can
 * never crash the process. It MUST be imported before kokoro-js/phonemizer.
 */

const GUARDED_EVENTS = new Set(["unhandledRejection", "uncaughtException"]);

type Listener = (...args: unknown[]) => unknown;
type AddListener = (event: string | symbol, listener: Listener) => NodeJS.Process;

function patchMethod(methodName: "on" | "addListener" | "prependListener"): void {
  const original = process[methodName].bind(process) as AddListener;

  const patched: AddListener = (event, listener) => {
    if (typeof event === "string" && GUARDED_EVENTS.has(event) && typeof listener === "function") {
      const safe: Listener = (...args) => {
        try {
          return listener(...args);
        } catch {
          // Neutralize re-throwing third-party handlers (e.g. phonemizer).
          return undefined;
        }
      };
      return original(event, safe);
    }
    return original(event, listener);
  };

  (process[methodName] as unknown) = patched;
}

patchMethod("on");
patchMethod("addListener");
patchMethod("prependListener");
