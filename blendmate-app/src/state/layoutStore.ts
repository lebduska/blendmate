import { useEffect, useMemo, useState } from "react";

type LayoutState = {
  inspectorOpen: boolean;
  bottomOpen: boolean;
};

const KEY = "blendmate.layout.vnext";

function readInitial(): LayoutState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { inspectorOpen: true, bottomOpen: true };
    const parsed = JSON.parse(raw);
    return {
      inspectorOpen: Boolean(parsed.inspectorOpen),
      bottomOpen: Boolean(parsed.bottomOpen),
    };
  } catch {
    return { inspectorOpen: true, bottomOpen: true };
  }
}

export function useLayoutStore() {
  const [state, setState] = useState<LayoutState>(() => readInitial());

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  return useMemo(
    () => ({
      inspectorOpen: state.inspectorOpen,
      bottomOpen: state.bottomOpen,
      toggleInspector: () =>
        setState((s) => ({ ...s, inspectorOpen: !s.inspectorOpen })),
      toggleBottom: () =>
        setState((s) => ({ ...s, bottomOpen: !s.bottomOpen })),
      resetLayout: () => setState({ inspectorOpen: true, bottomOpen: true }),
    }),
    [state]
  );
}
