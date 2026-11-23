"use client";

import { useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Link2,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "@/lib/demo/store";
import { GOOGLE_SITES, SITES, googleSearchPropertyForSite } from "@/lib/demo/sites";
import { api } from "@/lib/api/client";
import type { SyncRun } from "@/lib/api/types";
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
    : "Aucun relevé";

type Provider = "gsc" | "ga4";

function sourceState(property: string | null | undefined, run: SyncRun | undefined) {
  if (!property)
    return {
      label: "Non détectée",
      variant: "muted" as const,
      detail: "Aucune propriété accessible avec le compte Google connecté.",
    };
  if (run?.status === "error")
    return {
      label: "Accès à corriger",
      variant: "danger" as const,
      detail:
        run.message ??
        "Le dernier relevé n’a pas abouti. Renouvelez l’accès Google puis relancez la détection.",
    };
  if (run?.status === "success")
    return { label: "Connectée", variant: "success" as const, detail: property };
  return { label: "Prête", variant: "info" as const, detail: property };
}

function SourceRow({
  provider,
  property,
  run,
}: {
  provider: Provider;
  property: string | null | undefined;
  run: SyncRun | undefined;
}) {
  const state = sourceState(property, run);
  return (
    <div className="grid gap-1 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{sourceLabel(provider)}</span>
        <Badge variant={state.variant}>{state.label}</Badge>
      </div>
      <p
        className="min-h-5 break-words text-xs leading-5 text-muted-foreground"
        title={state.detail}
      >
        {state.detail}
      </p>
      <p className="text-xs text-muted-foreground">
        Dernier relevé : {when(run?.finished_at ?? null)}
      </p>
    </div>
  );
}

export default function ConnectionsPage() {
  const { connections, refresh, user } = useDemo();
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const recentBy = (siteId: string, provider: Provider) =>
    connections.runs.find((run) => run.site_id === siteId && run.provider === provider);
  const connectedSources = GOOGLE_SITES.reduce((total, site) => {
    const integration = connections.sites.find((item) => item.site_id === site.id);
    return (
      total +
      Number(Boolean(integration?.gsc_property)) +
      Number(Boolean(integration?.ga4_property))
    );
  }, 0);
  const failingSources = GOOGLE_SITES.reduce((total, site) => {
    const integration = connections.sites.find((item) => item.site_id === site.id);
    return (
      total +
      Number(Boolean(integration?.gsc_property) && recentBy(site.id, "gsc")?.status === "error") +
      Number(Boolean(integration?.ga4_property) && recentBy(site.id, "ga4")?.status === "error")
    );
  }, 0);
  const pendingSources = GOOGLE_SITES.reduce((total, site) => {
    const integration = connections.sites.find((item) => item.site_id === site.id);
    return (
      total +
      Number(Boolean(integration?.gsc_property) && recentBy(site.id, "gsc")?.status !== "success") +
      Number(Boolean(integration?.ga4_property) && recentBy(site.id, "ga4")?.status !== "success")
    );
  }, 0);
  const latestRuns = connections.runs.reduce<SyncRun[]>((runs, run) => {
    const alreadyIncluded = runs.some(
      (candidate) => candidate.site_id === run.site_id && candidate.provider === run.provider,
    );
    return alreadyIncluded ? runs : [...runs, run];
  }, []);

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

  async function discover() {
    try {
      setBusy(true);
      setError("");
      const result = await api<{ linked: string[]; cleared: string[]; errors: string[] }>(
        "/google/discover",
        {
          method: "POST",
        },
      );
      await refresh();
      if (result.errors.length) {
        setError(result.errors.join(" "));
        toast.error("Google a refusé une partie de la détection.");
      } else if (result.linked.length || result.cleared.length) {
        toast.success(
          `${result.linked.length} liaison(s) détectée(s), ${result.cleared.length} liaison(s) obsolète(s) retirée(s).`,
        );
      } else {
        toast.message("Aucune nouvelle propriété Google accessible n’a été trouvée.");
      }
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Détection Google indisponible";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function synchronize() {
    try {
      setSyncing(true);
      setError("");
      const result = await api<{ completed: number; failed: number; skipped?: string }>(
        "/google/synchronize",
        { method: "POST" },
      );
      await refresh();
      if (result.skipped) {
        toast.message("La synchronisation attend une connexion Google valide.");
      } else if (result.failed) {
        toast.warning(`${result.completed} source(s) relevée(s), ${result.failed} à corriger.`);
      } else {
        toast.success(`${result.completed} source(s) relevée(s) avec les données disponibles.`);
      }
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : "Synchronisation Google indisponible";
      setError(message);
      toast.error(message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sources Google"
        description="Le suivi reste automatique : les données disponibles sont reliées par domaine, tandis que les accès absents sont signalés sans masquer le reste du portefeuille."
      />
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <Panel
        title="Connexion en lecture seule"
        description="Le compte Google sert uniquement à lire Search Console et GA4. Il ne modifie aucune propriété ni aucun site."
        action={
          <Badge variant={connections.googleConnected ? "success" : "warning"}>
            {connections.googleConnected ? "Compte connecté" : "À connecter"}
          </Badge>
        }
      >
        <div className="flex flex-col justify-between gap-5 rounded-xl border bg-muted/25 p-5 lg:flex-row lg:items-center">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Une propriété n’apparaît que si le compte Google connecté y dispose réellement des
              droits de lecture. Chaque site est relié à son URL exacte : les données ne se
              mélangent donc pas entre les sous-domaines.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={busy || !connections.googleConnected || user?.role !== "admin"}
              onClick={() => void discover()}
            >
              <RefreshCw className={busy ? "size-4 animate-spin" : "size-4"} />
              {busy ? "Détection en cours…" : "Détecter les propriétés"}
            </Button>
            <Button
              variant="outline"
              disabled={busy || syncing || !connections.googleConnected || user?.role === "viewer"}
              onClick={() => void synchronize()}
            >
              <RefreshCw className={syncing ? "size-4 animate-spin" : "size-4"} />
              {syncing ? "Synchronisation…" : "Synchroniser maintenant"}
            </Button>
            <Button
              disabled={busy || !connections.googleConfigured || user?.role !== "admin"}
              onClick={() => void reconnect()}
            >
              <PlugZap className="size-4" />
              {connections.googleConnected ? "Renouveler l’accès" : "Connecter Google"}
            </Button>
          </div>
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="card-surface p-4">
          <p className="text-xs font-medium text-muted-foreground">Sites suivis par Google</p>
          <p className="mt-1 text-2xl font-bold tabular">{GOOGLE_SITES.length}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-xs font-medium text-muted-foreground">Sources reliées</p>
          <p className="mt-1 text-2xl font-bold tabular">
            {connectedSources}
            <span className="text-sm font-medium text-muted-foreground">
              {" "}
              / {GOOGLE_SITES.length * 2}
            </span>
          </p>
        </div>
        <div className="card-surface p-4">
          <p className="text-xs font-medium text-muted-foreground">Accès à corriger</p>
          <p className="mt-1 text-2xl font-bold tabular">{failingSources}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-xs font-medium text-muted-foreground">Sans relevé réussi</p>
          <p className="mt-1 text-2xl font-bold tabular">{pendingSources}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-xs font-medium text-muted-foreground">Fréquence</p>
          <p className="mt-1 flex items-center gap-1 text-sm font-semibold">
            <TimerReset className="size-4 text-primary" /> Toutes les 4 h
          </p>
        </div>
      </div>

      <Panel
        title="Couverture Google par site"
        description="GA4 est rafraîchi jusqu’à J-1. Search Console s’arrête à J-3. Les données organiques ne sont donc pas un flux temps réel. AMBS Outreach est volontairement exclu de cette synchronisation."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {GOOGLE_SITES.map((site) => {
            const integration = connections.sites.find((item) => item.site_id === site.id);
            const gsc = sourceState(integration?.gsc_property, recentBy(site.id, "gsc"));
            const ga4 = sourceState(integration?.ga4_property, recentBy(site.id, "ga4"));
            const connected = gsc.variant === "success" || ga4.variant === "success";
            return (
              <article key={site.id} className="rounded-xl border bg-background p-4 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-3 border-b pb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold leading-6">{site.name}</h3>
                    <p className="mt-1 truncate text-xs text-muted-foreground" title={site.host}>
                      {site.host}
                    </p>
                  </div>
                  {connected ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
                  ) : (
                    <CircleAlert className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  )}
                </div>
                <div className="divide-y">
                  <SourceRow
                    provider="gsc"
                    property={integration?.gsc_property}
                    run={recentBy(site.id, "gsc")}
                  />
                  <SourceRow
                    provider="ga4"
                    property={integration?.ga4_property}
                    run={recentBy(site.id, "ga4")}
                  />
                </div>
                {!integration?.gsc_property && (
                  <p className="mt-3 rounded-md bg-muted/60 px-3 py-2 text-xs leading-5 text-muted-foreground">
                    Propriété URL attendue :{" "}
                    <code className="font-medium text-foreground">
                      {googleSearchPropertyForSite(site.id)}
                    </code>
                  </p>
                )}
              </article>
            );
          })}
        </div>
        <div className="mt-5 flex items-start gap-2 rounded-lg border border-muted bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
          <Link2 className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            « Non détectée » signifie que le compte Google connecté ne dispose pas d’une propriété
            compatible. Ce statut n’empêche ni le crawl public, ni les audits SEO et GEO du site.
          </span>
        </div>
      </Panel>

      <Panel
        title="Accès Search Console à établir"
        description="Chaque propriété est vérifiée sur son URL exacte. Cette méthode évite tout accès DNS et rend l’association de données explicite."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {GOOGLE_SITES.map((site) => {
            const property = googleSearchPropertyForSite(site.id)!;
            const integration = connections.sites.find((item) => item.site_id === site.id);
            return (
              <article key={site.id} className="rounded-xl border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{site.name}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {integration?.gsc_property
                        ? "Propriété détectée. Utilisez « Synchroniser maintenant » pour le premier relevé."
                        : "Propriété URL à valider avec le fichier ou la balise fournie par Google."}
                    </p>
                  </div>
                  <a
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
                    href={`https://search.google.com/search-console?resource_id=${encodeURIComponent(property)}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Ouvrir <ExternalLink className="size-3.5" />
                  </a>
                </div>
                <code className="mt-4 block break-all rounded-md bg-muted px-3 py-2 text-xs text-foreground">
                  {property}
                </code>
              </article>
            );
          })}
        </div>
        <div className="mt-4 grid gap-3 rounded-lg border border-muted bg-muted/30 p-4 text-sm leading-6 text-muted-foreground md:grid-cols-2">
          <p>
            <b className="text-foreground">Méthode utilisée — fichier HTML.</b> Le fichier fourni
            par Search Console est servi à la racine du site, puis Google confirme l’URL concernée.
          </p>
          <p>
            <b className="text-foreground">Alternative — balise HTML.</b> Si le site ne sert pas de
            fichier statique, la balise fournie par Google est ajoutée dans son
            <code> &lt;head&gt;</code>. Chaque URL reste indépendante.
          </p>
        </div>
      </Panel>

      <Panel
        title="Mesure GA4 par site"
        description="Une source GA4 n’est utilisable que si une propriété et un flux Web correspondent à l’hôte exact. Le tag Google doit être installé sur le site concerné ; il ne remplace pas la vérification Search Console."
      >
        <p className="text-sm leading-6 text-muted-foreground">
          Après ajout ou correction d’un flux, reconnectez le compte puis lancez « Détecter les
          propriétés ». Les associations sont contrôlées par domaine et les anciennes liaisons
          devenues inaccessibles sont retirées automatiquement.
        </p>
      </Panel>

      <Panel
        title="Historique des synchronisations"
        description="Chaque exécution indique la période et la source utilisées."
      >
        <div className="space-y-3">
          {!connections.runs.length && (
            <p className="text-sm text-muted-foreground">
              La première synchronisation automatique démarrera peu après le déploiement.
            </p>
          )}
          {latestRuns.map((run) => (
            <div key={run.id} className="border-b pb-3 text-sm last:border-0">
              <div className="flex flex-wrap items-center gap-2">
                <b>
                  {SITES.find((site) => site.id === run.site_id)?.name ?? run.site_id} ·{" "}
                  {sourceLabel(run.provider as Provider)}
                </b>
                <Badge
                  variant={
                    run.status === "success"
                      ? "success"
                      : run.status === "error"
                        ? "danger"
                        : "warning"
                  }
                >
                  {run.status === "success"
                    ? "Réussie"
                    : run.status === "error"
                      ? "À corriger"
                      : "En cours"}
                </Badge>
                <span className="text-muted-foreground">
                  {run.start_date?.slice(0, 10)} → {run.end_date?.slice(0, 10)} · {run.row_count}{" "}
                  lignes
                </span>
              </div>
              {run.message && <p className="mt-2 text-xs text-muted-foreground">{run.message}</p>}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
