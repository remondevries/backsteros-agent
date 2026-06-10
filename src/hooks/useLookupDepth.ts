import { useCallback, useEffect, useState } from "react";
import {
  readLookupDepthMode,
  subscribeLookupDepthMode,
  writeLookupDepthMode,
  type LookupDepthMode,
} from "../lookup/lookupDepth";

export function useLookupDepth() {
  const [mode, setModeState] = useState<LookupDepthMode>(readLookupDepthMode);

  useEffect(() => {
    const sync = () => setModeState(readLookupDepthMode());
    return subscribeLookupDepthMode(sync);
  }, []);

  const setMode = useCallback((next: LookupDepthMode) => {
    writeLookupDepthMode(next);
    setModeState(next);
  }, []);

  return { mode, setMode };
}
