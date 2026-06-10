import { useCallback, useEffect, useState } from "react";
import {
  readLookupOutputFormat,
  subscribeLookupOutputFormat,
  writeLookupOutputFormat,
  type LookupOutputFormat,
} from "../lookup/lookupOutputFormat";

export function useLookupOutputFormat() {
  const [format, setFormatState] = useState<LookupOutputFormat>(readLookupOutputFormat);

  useEffect(() => {
    const sync = () => setFormatState(readLookupOutputFormat());
    return subscribeLookupOutputFormat(sync);
  }, []);

  const setFormat = useCallback((next: LookupOutputFormat) => {
    writeLookupOutputFormat(next);
    setFormatState(next);
  }, []);

  return { format, setFormat };
}
