"use client";
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
import { type DemoState } from "./schema";
import { emptyState, scopeState } from "./scope";
import { SITES, siteForUrl, type SiteScope } from "./sites";
import { api } from "../api/client";
import type { Member, Connections, PublicObservation, Metrics } from "../api/types";
import { toast } from "sonner";
export type Period = "7j" | "30j" | "90j" | "12m";
export const PERIOD_DAYS: Record<Period, number> = { "7j": 7, "30j": 30, "90j": 90, "12m": 365 };
export const PERIOD_LABEL: Record<Period, string> = {
  "7j": "7 derniers jours",
  "30j": "30 derniers jours",
  "90j": "90 derniers jours",
  "12m": "12 derniers mois",
};
export type Workspace = "ambs" | "demo";
type State = DemoState;
interface Ctx extends State {
  siteScope: SiteScope;
  setSiteScope: (site: SiteScope) => void;
  setPeriod: (p: Period) => void;
  update: <K extends keyof State>(key: K, fn: (v: State[K]) => State[K]) => Promise<boolean>;
  storageAvailable: boolean;
  workspace: Workspace;
  snapshot: () => State;
  user: Member | null;
  members: Member[];
  loading: boolean;
  setupRequired: boolean;
  production: boolean;
  saving: boolean;
  error: string;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  connections: Connections;
  observations: PublicObservation[];
  metrics: Metrics | null;
}
const Ctx = createContext<Ctx | null>(null);
export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(emptyState),
    [siteScope, setScope] = useState<SiteScope>("all");
  const [user, setUser] = useState<Member | null>(null),
    [members, setMembers] = useState<Member[]>([]),
    [loading, setLoading] = useState(true),
    [setupRequired, setSetup] = useState(false),
    [production, setProduction] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const [connections, setConnections] = useState<Connections>({
    googleConfigured: false,
    googleConnected: false,
    sites: [],
    runs: [],
  });
  const [observations, setObservations] = useState<PublicObservation[]>([]),
    [metrics, setMetrics] = useState<Metrics | null>(null);
  const stateRef = useRef(state),
    savedRef = useRef(state),
    revision = useRef(0),
    queue = useRef(Promise.resolve()),
    generation = useRef(0),
    pending = useRef(0);
  const commit = (next: State) => {
    stateRef.current = next;
    setState(next);
  };
  const refresh = useCallback(async () => {
    setError("");
    try {
      const session = await api<{
        user: Member | null;
        setupRequired: boolean;
        production: boolean;
      }>("/auth/session");
      setUser(session.user);
      setSetup(session.setupRequired);
      setProduction(session.production);
      if (!session.user) {
        commit(emptyState());
        return;
      }
      const [data, team, conn, publicPages] = await Promise.all([
        api<{ state: State; revision: number }>("/workspace"),
        api<{ users: Member[] }>("/users"),
        api<Connections>("/integrations"),
        api<{ pages: PublicObservation[] }>("/public-pages"),
      ]);
      revision.current = data.revision;
      savedRef.current = data.state;
      commit({ ...data.state, period: stateRef.current.period });
      setMembers(team.users);
      setConnections(conn);
      setObservations(publicPages.pages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connexion au serveur impossible");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    try {
      const scope = localStorage.getItem("ambs-real-site");
      if (SITES.some((s) => s.id === scope)) setScope(scope as SiteScope);
    } catch {}
  }, [refresh]);
  useEffect(() => {
    if (!user) return;
    let active = true;
    setMetrics(null);
    api<Metrics>(`/metrics?site=${siteScope}&days=${PERIOD_DAYS[state.period]}`)
      .then((data) => {
        if (active) setMetrics(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [user, siteScope, state.period, connections]);
  const update = useCallback<Ctx["update"]>(
    async (key, fn) => {
      if (!user || user.role === "viewer") {
        toast.error("Un compte en écriture est requis.");
        return false;
      }
      if (key === "period") {
        commit({ ...stateRef.current, period: fn(stateRef.current.period as never) as Period });
        return true;
      }
      let items = fn(stateRef.current[key]);
      if (Array.isArray(items) && key !== "families" && key !== "audits") {
        items = items.map((item: any) =>
          item?.id && !item.siteId
            ? {
                ...item,
                siteId:
                  siteForUrl(item.url ?? item.target ?? "")?.id ??
                  stateRef.current.pages.find((p) => p.id === item.pageId)?.siteId ??
                  stateRef.current.prompts.find((p) => p.id === item.promptId)?.siteId ??
                  (siteScope === "all" ? "ambs" : siteScope),
              }
            : item,
        ) as typeof items;
      }
      commit({ ...stateRef.current, [key]: items });
      pending.current++;
      setSaving(true);
      const epoch = generation.current;
      let ok = false;
      const work = queue.current
        .then(async () => {
          if (epoch !== generation.current) return;
          try {
            const result = await api<{ revision: number }>(`/workspace/${key}`, {
              method: "PUT",
              body: JSON.stringify({ revision: revision.current, items }),
            });
            revision.current = result.revision;
            savedRef.current = { ...savedRef.current, [key]: items };
            ok = true;
            setError("");
          } catch (e) {
            generation.current++;
            const message = e instanceof Error ? e.message : "Sauvegarde refusée";
            setError(message);
            toast.error(message);
            try {
              const fresh = await api<{ state: State; revision: number }>("/workspace");
              revision.current = fresh.revision;
              savedRef.current = fresh.state;
              commit(fresh.state);
            } catch {
              commit(savedRef.current);
            }
          }
        })
        .finally(() => {
          pending.current--;
          if (!pending.current) setSaving(false);
        });
      queue.current = work.catch(() => {});
      await work;
      return ok;
    },
    [siteScope, user],
  );
  const value = useMemo<Ctx>(
    () => ({
      ...scopeState(state, siteScope),
      siteScope,
      setSiteScope: (scope) => {
        setScope(scope);
        try {
          localStorage.setItem("ambs-real-site", scope);
        } catch {}
      },
      setPeriod: (period) => commit({ ...stateRef.current, period }),
      update,
      storageAvailable: !error,
      workspace: "ambs",
      snapshot: () => stateRef.current,
      user,
      members,
      loading,
      setupRequired,
      production,
      saving,
      error,
      refresh,
      logout: async () => {
        await api("/auth/logout", { method: "POST" });
        setUser(null);
        commit(emptyState());
      },
      connections,
      observations,
      metrics,
    }),
    [
      state,
      siteScope,
      update,
      user,
      members,
      loading,
      setupRequired,
      production,
      saving,
      error,
      refresh,
      connections,
      observations,
      metrics,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useDemo() {
  const value = useContext(Ctx);
  if (!value) throw new Error("Workspace provider missing");
  return value;
}
export const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
