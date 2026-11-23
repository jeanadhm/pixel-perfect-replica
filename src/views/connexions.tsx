"use client";
import { useState } from "react";
import { PlugZap, RefreshCw, ShieldCheck, TimerReset } from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "@/lib/demo/store";
import { SITES } from "@/lib/demo/sites";
import { api } from "@/lib/api/client";
import { PageHeader, Panel } from "@/components/shared/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const sourceLabel = (source: "gsc" | "ga4") =>
  source === "gsc" ? "Search Console" : "Google Analytics 4";
const when = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value),
      )
    : "En attente";

export default function ConnectionsPage() {
  const { connections, refresh, user } = useDemo();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const recentBy = (siteId: string, provider: "gsc" | "ga4") =>
    connections.runs.find((run) => run.site_id === siteId && run.provider === provider);

  async function reconnect() {
    try {
      setBusy(true);
      setError("");
      const result = await api<{ url: string }>("/google/start");
      window.location.assign(result.url);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Connexion Google indisponible";
      setError(message);
      toast.error(message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sources Google · pilote automatique"
        description="Les propriétés sont reconnues par domaine, les données sont actualisées par le serveur et chaque relevé reste traçable."
      />
      {error && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <Panel
        title="Connexion en lecture seule"
        description="Le compte Google sert uniquement à lire Search Console et GA4. Il ne modifie aucune propriété ni aucun site."
        action={<Badge variant={connections.googleConnected ? "success" : "warning"}>{connections.googleConnected ? "Connecté" : "À connecter"}</Badge>}
      >
        <div className="flex flex-col justify-between gap-5 rounded-xl border bg-muted/25 p-5 md:flex-row md:items-center">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 text-primary" />
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Après autorisation, AMBS détecte les propriétés auxquelles ce compte a accès. Les associations existantes ne sont jamais écrasées.
            </p>
          </div>
          <Button disabled={busy || !connections.googleConfigured || user?.role !== "admin"} onClick={() => void reconnect()}>
            <PlugZap className="size-4" />
            {connections.googleConnected ? "Renouveler l’accès" : "Connecter Google"}
          </Button>
        </div>
      </Panel>

      <Panel
        title="Actualisation automatique"
        description="GA4 est rafraîchi sur les 30 derniers jours jusqu’à J-1. Search Console est rafraîchi jusqu’à J-3 : Google ne publie pas de données organiques en temps réel."
        action={<Badge variant="success"><TimerReset className="mr-1 size-3.5" /> Toutes les 4 heures</Badge>}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SITES.map((site) => {
            const integration = connections.sites.find((item) => item.site_id === site.id);
            return (
              <article key={site.id} className="rounded-xl border p-4">
                <h3 className="font-semibold">{site.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{site.host}</p>
                {(["gsc", "ga4"] as const).map((provider) => {
                  const property = integration?.[provider === "gsc" ? "gsc_property" : "ga4_property"];
                  const last = recentBy(site.id, provider);
                  return (
                    <div key={provider} className="mt-4 border-t pt-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span>{sourceLabel(provider)}</span>
                        <Badge variant={property ? "success" : "warning"}>{property ? "Reliée" : "En recherche"}</Badge>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground" title={property ?? undefined}>{property ?? "Aucune propriété compatible détectée"}</p>
                      <p className="mt-2 text-xs text-muted-foreground">Dernier relevé : {when(last?.finished_at ?? null)}</p>
                    </div>
                  );
                })}
              </article>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => void refresh()}>
            <RefreshCw className="size-3.5" /> Actualiser le statut
          </Button>
          <span>Les nouvelles données apparaissent sans fichier CSV ni saisie de propriété.</span>
        </div>
      </Panel>

      <Panel title="Historique des synchronisations" description="Chaque exécution indique la période et la source utilisées.">
        <div className="space-y-3">
          {!connections.runs.length && <p className="text-sm text-muted-foreground">La première synchronisation automatique démarrera peu après le déploiement.</p>}
          {connections.runs.map((run) => (
            <div key={run.id} className="border-b pb-3 text-sm last:border-0">
              <div className="flex flex-wrap items-center gap-2">
                <b>{SITES.find((site) => site.id === run.site_id)?.name ?? run.site_id} · {sourceLabel(run.provider as "gsc" | "ga4")}</b>
                <Badge variant={run.status === "success" ? "success" : run.status === "error" ? "danger" : "warning"}>
                  {run.status === "success" ? "Réussie" : run.status === "error" ? "À contrôler" : "En cours"}
                </Badge>
                <span className="text-muted-foreground">{run.start_date?.slice(0, 10)} → {run.end_date?.slice(0, 10)} · {run.row_count} lignes</span>
              </div>
              {run.message && <p className="mt-2 text-xs text-muted-foreground">{run.message}</p>}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
