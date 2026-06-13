import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type FocusContentSnapshot =
  | {
      kind: "linear_issue";
      description: string | null;
    }
  | {
      kind: "linear_document";
      title: string;
      content: string;
    }
  | {
      kind: "vault_document";
      title: string;
      body: string;
    }
  | {
      kind: "linear_workspace";
      summary: string | null;
      description: string | null;
    };

type FocusContentSnapshotUpdater =
  | FocusContentSnapshot
  | null
  | ((current: FocusContentSnapshot | null) => FocusContentSnapshot | null);

type FocusContentContextValue = {
  focusContentSnapshot: FocusContentSnapshot | null;
  setFocusContentSnapshot: (snapshot: FocusContentSnapshotUpdater) => void;
  flushFocusContentSnapshot: () => void;
  scheduleDebouncedSnapshot: (snapshot: FocusContentSnapshot) => void;
};

const FocusContentContext = createContext<FocusContentContextValue | null>(null);

export function focusContentSnapshotsEqual(
  left: FocusContentSnapshot | null,
  right: FocusContentSnapshot | null,
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  if (left.kind !== right.kind) return false;
  switch (left.kind) {
    case "linear_issue":
      return right.kind === "linear_issue" && left.description === right.description;
    case "linear_document":
      return (
        right.kind === "linear_document" &&
        left.title === right.title &&
        left.content === right.content
      );
    case "vault_document":
      return (
        right.kind === "vault_document" &&
        left.title === right.title &&
        left.body === right.body
      );
    case "linear_workspace":
      return (
        right.kind === "linear_workspace" &&
        left.summary === right.summary &&
        left.description === right.description
      );
    default:
      return false;
  }
}

type FocusContentController = {
  setSnapshot: (snapshot: FocusContentSnapshotUpdater) => void;
  clear: () => void;
  clearKind: (kind: FocusContentSnapshot["kind"]) => void;
  getSnapshot: () => FocusContentSnapshot | null;
  flush: () => void;
};

let focusContentController: FocusContentController | null = null;

export function getFocusContentController(): FocusContentController | null {
  return focusContentController;
}

export function FocusContentProvider({
  children,
  resetNonce = 0,
}: {
  children: ReactNode;
  resetNonce?: number;
}) {
  const [focusContentSnapshot, setFocusContentSnapshotState] =
    useState<FocusContentSnapshot | null>(null);
  const pendingSnapshotRef = useRef<FocusContentSnapshot | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applySnapshot = useCallback((snapshot: FocusContentSnapshot | null) => {
    setFocusContentSnapshotState((current) =>
      focusContentSnapshotsEqual(current, snapshot) ? current : snapshot,
    );
  }, []);

  const flushFocusContentSnapshot = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (pendingSnapshotRef.current !== null) {
      applySnapshot(pendingSnapshotRef.current);
      pendingSnapshotRef.current = null;
    }
  }, [applySnapshot]);

  const setFocusContentSnapshot = useCallback(
    (snapshot: FocusContentSnapshotUpdater) => {
      if (typeof snapshot === "function") {
        setFocusContentSnapshotState((current) => {
          const next = snapshot(current);
          return focusContentSnapshotsEqual(current, next) ? current : next;
        });
        return;
      }
      applySnapshot(snapshot);
    },
    [applySnapshot],
  );

  const scheduleDebouncedSnapshot = useCallback(
    (snapshot: FocusContentSnapshot) => {
      pendingSnapshotRef.current = snapshot;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        const pending = pendingSnapshotRef.current;
        pendingSnapshotRef.current = null;
        if (pending) {
          applySnapshot(pending);
        }
      }, 400);
    },
    [applySnapshot],
  );

  const clear = useCallback(() => {
    pendingSnapshotRef.current = null;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setFocusContentSnapshotState(null);
  }, []);

  const clearKind = useCallback((kind: FocusContentSnapshot["kind"]) => {
    setFocusContentSnapshotState((current) => (current?.kind === kind ? null : current));
  }, []);

  useEffect(() => {
    focusContentController = {
      setSnapshot: setFocusContentSnapshot,
      clear,
      clearKind,
      getSnapshot: () => focusContentSnapshot,
      flush: flushFocusContentSnapshot,
    };
    return () => {
      focusContentController = null;
    };
  }, [clear, clearKind, flushFocusContentSnapshot, focusContentSnapshot, setFocusContentSnapshot]);

  useEffect(() => {
    if (resetNonce === 0) return;
    clear();
  }, [clear, resetNonce]);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  const value = useMemo(
    () => ({
      focusContentSnapshot,
      setFocusContentSnapshot,
      flushFocusContentSnapshot,
      scheduleDebouncedSnapshot,
    }),
    [
      focusContentSnapshot,
      flushFocusContentSnapshot,
      scheduleDebouncedSnapshot,
      setFocusContentSnapshot,
    ],
  );

  return (
    <FocusContentContext.Provider value={value}>{children}</FocusContentContext.Provider>
  );
}

export function useFocusContent() {
  const context = useContext(FocusContentContext);
  if (!context) {
    throw new Error("useFocusContent must be used within FocusContentProvider");
  }
  return context;
}

export function useDebouncedFocusContentSnapshot(
  snapshot: FocusContentSnapshot | null,
  enabled: boolean,
) {
  const { scheduleDebouncedSnapshot, flushFocusContentSnapshot } = useFocusContent();

  const snapshotKey = useMemo(() => {
    if (!snapshot) return "";
    switch (snapshot.kind) {
      case "linear_issue":
        return `linear_issue\0${snapshot.description ?? ""}`;
      case "linear_document":
        return `linear_document\0${snapshot.title}\0${snapshot.content}`;
      case "vault_document":
        return `vault_document\0${snapshot.title}\0${snapshot.body}`;
      case "linear_workspace":
        return `linear_workspace\0${snapshot.summary ?? ""}\0${snapshot.description ?? ""}`;
      default:
        return "";
    }
  }, [snapshot]);

  useEffect(() => {
    if (!enabled || !snapshot) {
      return;
    }
    scheduleDebouncedSnapshot(snapshot);
  }, [enabled, scheduleDebouncedSnapshot, snapshot, snapshotKey]);

  useEffect(
    () => () => {
      flushFocusContentSnapshot();
    },
    [flushFocusContentSnapshot],
  );
}
