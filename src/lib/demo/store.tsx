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
import { createPortfolioState, scopeState } from "./portfolio";
import { SITES, siteForUrl, type SiteScope } from "./sites";
import { toast } from "sonner";

export type Period = "7j" | "30j" | "90j" | "12m";
export const PERIOD_DAYS: Record<Period, number> = { "7j": 7, "30j": 30, "90j": 90, "12m": 365 };
export const PERIOD_LABEL: Record<Period, string> = {
  "7j": "7 derniers jours",
  "30j": "30 derniers jours",
  "90j": "90 derniers jours",
  "12m": "12 derniers mois",
};

type State = DemoState;
const initial = createPortfolioState;

// Persists demo edits in the browser; bump the key when the seed shape changes.
export type Workspace = "ambs" | "demo";
const KEYS: Record<Workspace, string> = { demo: "ambs-hub-demo-v2", ambs: "ambs-hub-workspace-v1" };
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
  siteScope: SiteScope;
  setSiteScope: (scope: SiteScope) => void;
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
  const [workspace, setWorkspace] = useState<Workspace>("demo");
  const [state, setState] = useState<State>(() => workspaceInitial("demo"));
  const [siteScope, setSiteScope] = useState<SiteScope>("all");
  const [loaded, setLoaded] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    try {
      const selected =
        localStorage.getItem("ambs-hub-active-workspace-v2") === "ambs" ? "ambs" : "demo";
      const scope = localStorage.getItem("ambs-hub-site-scope");
      if (SITES.some((s) => s.id === scope)) setSiteScope(scope as SiteScope);
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
      localStorage.setItem("ambs-hub-active-workspace-v2", workspace);
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  }, [state, loaded, workspace]);

  const update = useCallback<Ctx["update"]>(
    (key, fn) =>
      setState((s) => {
        let next = fn(s[key]);
        if (Array.isArray(next) && key !== "families" && key !== "audits") {
          const oldIds = new Set((s[key] as { id: string }[]).map((item) => item.id));
          next = next.map((item) =>
            typeof item === "object" &&
            item &&
            "id" in item &&
            !oldIds.has(item.id) &&
            (!("siteId" in item) || !item.siteId)
              ? {
                  ...item,
                  siteId:
                    ("url" in item && typeof item.url === "string"
                      ? siteForUrl(item.url)?.id
                      : undefined) ??
                    ("target" in item && typeof item.target === "string"
                      ? siteForUrl(item.target)?.id
                      : undefined) ??
                    ("pageId" in item
                      ? s.pages.find((p) => p.id === item.pageId)?.siteId
                      : undefined) ??
                    ("promptId" in item
                      ? s.prompts.find((p) => p.id === item.promptId)?.siteId
                      : undefined) ??
                    (siteScope === "all" ? "ambs" : siteScope),
                }
              : item,
          ) as typeof next;
        }
        return { ...s, [key]: next };
      }),
    [siteScope],
  );
  const value = useMemo<Ctx>(
    () => ({
      ...scopeState(state, siteScope),
      siteScope,
      setSiteScope: (scope) => {
        setSiteScope(scope);
        try {
          localStorage.setItem("ambs-hub-site-scope", scope);
        } catch {
          /* State remains available in memory. */
        }
      },
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
    [state, update, storageAvailable, workspace, siteScope],
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
