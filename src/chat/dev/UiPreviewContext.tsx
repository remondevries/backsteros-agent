import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRunUiPreviewShortcut, RunUiPreviewPanel } from "./RunUiPreviewPanel";

type UiPreviewContextValue = {
  enabled: boolean;
  open: boolean;
  toggle: () => void;
  close: () => void;
};

const UiPreviewContext = createContext<UiPreviewContextValue>({
  enabled: false,
  open: false,
  toggle: () => {},
  close: () => {},
});

export function UiPreviewProvider({ children }: { children: ReactNode }) {
  const enabled = import.meta.env.DEV;
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => {
    setOpen((current) => !current);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  useRunUiPreviewShortcut(enabled ? toggle : () => {});

  const value = useMemo(
    () => ({
      enabled,
      open,
      toggle,
      close,
    }),
    [close, enabled, open, toggle],
  );

  return (
    <UiPreviewContext.Provider value={value}>
      {children}
      {enabled && open ? <RunUiPreviewPanel onClose={close} /> : null}
    </UiPreviewContext.Provider>
  );
}

export function useUiPreview() {
  return useContext(UiPreviewContext);
}
