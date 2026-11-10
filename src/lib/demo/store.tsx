import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Action, GeoPrompt, GeoTest, Keyword, SitePage } from "./types";
import { FAMILIES, seedActions, seedGeoTests, seedKeywords, seedPages, seedPrompts } from "./seed";

export type Period = "7j" | "30j" | "90j" | "12m";
export const PERIOD_DAYS: Record<Period, number> = { "7j": 7, "30j": 30, "90j": 90, "12m": 365 };
export const PERIOD_LABEL: Record<Period, string> = { "7j": "7 derniers jours", "30j": "30 derniers jours", "90j": "90 derniers jours", "12m": "12 derniers mois" };

interface State {
  keywords: Keyword[];
  families: string[];
  prompts: GeoPrompt[];
  geoTests: GeoTest[];
  actions: Action[];
  pages: SitePage[];
  period: Period;
}
const initial = (): State => ({
  keywords: seedKeywords,
  families: FAMILIES.map((f) => f.name),
  prompts: seedPrompts,
  geoTests: seedGeoTests,
  actions: seedActions,
  pages: seedPages,
  period: "30j",
});

// Persists demo edits in the browser; bump the key when the seed shape changes.
const KEY = "ambs-hub-demo-v1";

interface Ctx extends State {
  setPeriod: (p: Period) => void;
  update: <K extends keyof State>(key: K, fn: (v: State[K]) => State[K]) => void;
  reset: () => void;
}
const StoreCtx = createContext<Ctx | null>(null);

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...initial(), ...JSON.parse(raw) });
    } catch { /* ignore corrupted storage */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, loaded]);

  const update = useCallback<Ctx["update"]>((key, fn) => setState((s) => ({ ...s, [key]: fn(s[key]) })), []);
  const value = useMemo<Ctx>(() => ({
    ...state,
    setPeriod: (period) => setState((s) => ({ ...s, period })),
    update,
    reset: () => { localStorage.removeItem(KEY); setState(initial()); },
  }), [state, update]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useDemo() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useDemo outside provider");
  return c;
}

export const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
