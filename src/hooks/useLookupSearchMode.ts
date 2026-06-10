import { useCallback, useEffect, useState } from "react";
import {
  readLookupSearchMode,
  subscribeLookupSearchMode,
  writeLookupSearchMode,
  type LookupSearchMode,
} from "../lookup/lookupSearchMode";

export function useLookupSearchMode() {
  const [mode, setModeState] = useState<LookupSearchMode>(readLookupSearchMode);

  useEffect(() => {
    const sync = () => setModeState(readLookupSearchMode());
    return subscribeLookupSearchMode(sync);
  }, []);

  const setMode = useCallback((next: LookupSearchMode) => {
    writeLookupSearchMode(next);
    setModeState(next);
  }, []);

  return { mode, setMode };
}
