import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { stateSchema, type DemoState } from "./schema";
import { createAmbsState } from "./reference";
import { toast } from "sonner";
import {
  FAMILIES,
  seedActions,
  seedGeoTests,
  seedKeywords,
  seedPages,
  seedPrompts,
  seedLeads,
  seedBacklinks,
  seedCompetitors,
} from "./seed";

export type Period = "7j" | "30j" | "90j" | "12m";
export const PERIOD_DAYS: Record<Period, number> = { "7j": 7, "30j": 30, "90j": 90, "12m": 365 };
export const PERIOD_LABEL: Record<Period, string> = {
  "7j": "7 derniers jours",
  "30j": "30 derniers jours",
  "90j": "90 derniers jours",
  "12m": "12 derniers mois",
};

type State = DemoState;
const initial = (): State => ({
  keywords: seedKeywords,
  families: FAMILIES.map((f) => f.name),
  prompts: seedPrompts,
  geoTests: seedGeoTests,
  actions: seedActions,
  pages: seedPages,
  leads: seedLeads,
  backlinks: seedBacklinks,
  competitors: seedCompetitors,
  audits: [],
  period: "30j",
});

// Persists demo edits in the browser; bump the key when the seed shape changes.
export type Workspace = "ambs" | "demo";
const KEYS: Record<Workspace, string> = { demo: "ambs-hub-demo-v1", ambs: "ambs-hub-workspace-v1" };
const workspaceInitial = (workspace: Workspace) =>
  workspace === "demo" ? initial() : createAmbsState();
function readWorkspace(workspace: Workspace): State {
  const base = workspaceInitial(workspace);
  const raw = localStorage.getItem(KEYS[workspace]);
  if (!raw) return base;
  const parsed = stateSchema.safeParse({ ...base, ...JSON.parse(raw) });
  if (parsed.success) return parsed.data;
  toast.warning("Sauvegarde invalide : le référentiel initial a été restauré.");
  return base;
}

interface Ctx extends State {
  setPeriod: (p: Period) => void;
  update: <K extends keyof State>(key: K, fn: (v: State[K]) => State[K]) => void;
  reset: () => void;
  storageAvailable: boolean;
  workspace: Workspace;
  switchWorkspace: (workspace: Workspace) => void;
  snapshot: () => State;
  restore: (input: unknown) => boolean;
}
const StoreCtx = createContext<Ctx | null>(null);

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace>("ambs");
  const [state, setState] = useState<State>(() => workspaceInitial("ambs"));
  const [loaded, setLoaded] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    try {
      const selected =
        localStorage.getItem("ambs-hub-active-workspace") === "demo" ? "demo" : "ambs";
      setWorkspace(selected);
      setState(readWorkspace(selected));
    } catch {
      toast.warning("La sauvegarde locale est indisponible ou illisible.");
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEYS[workspace], JSON.stringify(state));
      localStorage.setItem("ambs-hub-active-workspace", workspace);
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  }, [state, loaded, workspace]);

  const update = useCallback<Ctx["update"]>(
    (key, fn) => setState((s) => ({ ...s, [key]: fn(s[key]) })),
    [],
  );
  const value = useMemo<Ctx>(
    () => ({
      ...state,
      storageAvailable,
      workspace,
      snapshot: () => state,
      restore: (input) => {
        const parsed = stateSchema.safeParse(input);
        if (!parsed.success) return false;
        setState(parsed.data);
        return true;
      },
      switchWorkspace: (next) => {
        if (next === workspace) return;
        try {
          localStorage.setItem(KEYS[workspace], JSON.stringify(state));
          setState(readWorkspace(next));
        } catch {
          toast.error(
            "Impossible de changer d’espace sans sauvegarder vos modifications. Exportez une sauvegarde depuis Paramètres.",
          );
          return;
        }
        setWorkspace(next);
      },
      setPeriod: (period) => setState((s) => ({ ...s, period })),
      update,
      reset: () => {
        setState(workspaceInitial(workspace));
      },
    }),
    [state, update, storageAvailable, workspace],
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useDemo() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useDemo outside provider");
  return c;
}

export const uid = (p: string) =>
  `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
