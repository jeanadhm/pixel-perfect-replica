"use client";
import { Link } from "@/components/navigation";
import { ArrowRight, ArrowUpRight, Globe2, Search, Bot, ListChecks, Users } from "lucide-react";
import { useDemo } from "@/lib/demo/store";
import { SITES, siteLabel } from "@/lib/demo/sites";
import { summarize, coverage } from "@/lib/api/metrics";
import { nf, pct } from "@/lib/demo/utils";
import { Panel, Kpi } from "@/components/shared/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AreaDuo, C } from "@/components/charts/charts";
import { NewActionDialog } from "@/components/actions/NewActionDialog";
export function PortfolioOverview() {
  const {
    siteScope,
    setSiteScope,
    keywords,
    actions,
    geoTests,
    leads,
    observations,
    connections,
    metrics,
    snapshot,
    user,
  } = useDemo();
  const sites = SITES.filter((s) => siteScope === "all" || s.id === siteScope),
    all = snapshot(),
    stats = summarize(metrics);
  const records = observations.filter((p) => sites.some((s) => new URL(p.url).hostname === s.host));
  const priorities = actions
    .filter((a) => a.status !== "Terminé")
    .sort(
      (a, b) =>
        ["Critique", "Haute", "Moyenne", "Basse"].indexOf(a.priority) -
        ["Critique", "Haute", "Moyenne", "Basse"].indexOf(b.priority),
    )
    .slice(0, 4);
  return (
    <div className="space-y-7">
      <section className="rounded-2xl bg-[#123e35] p-6 text-white md:p-9">
        <div className="grid gap-7 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-emerald-200">
              AMBS · Pilotage vérifiable
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              {siteScope === "all" ? "Une vision fiable de vos sites." : siteLabel(siteScope)}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-emerald-50/80">
              Bonjour {user?.name}. Suivez les données de vos sources, les actions de l’équipe et
              les observations réellement documentées.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="bg-white text-[#123e35] hover:bg-emerald-50">
                <Link to="/connexions">
                  Configurer les sources
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/25 bg-transparent text-white hover:bg-white/10"
              >
                <Link to="/actions">
                  Plan d’action
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/5 p-5">
            <p className="text-sm font-medium">État des données</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt>Sites suivis</dt>
                <dd>{sites.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>URL documentées</dt>
                <dd>{records.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Search Console</dt>
                <dd>{stats.searchKnown ? "Relevés disponibles" : "À connecter / synchroniser"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Analytics GA4</dt>
                <dd>{stats.gaKnown ? "Relevés disponibles" : "À connecter / synchroniser"}</dd>
              </div>
            </dl>
            <p className="mt-5 border-t border-white/15 pt-3 text-xs leading-5 text-emerald-100/80">
              Une valeur « — » signifie non mesurée. Elle ne signifie pas zéro.
            </p>
          </div>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi
          label="Impressions Google"
          value={nf(stats.impressions)}
          sub={stats.searchKnown ? "Source : Search Console" : "Aucun relevé Search Console"}
          icon={Search}
        />
        <Kpi
          label="Clics organiques"
          value={nf(stats.clicks)}
          sub={
            stats.searchKnown
              ? `${metrics?.startDate} → ${metrics?.endDate}`
              : "Aucune estimation affichée"
          }
        />
        <Kpi
          label="Observations GEO"
          value={geoTests.length}
          sub="Réponses saisies avec une preuve"
          icon={Bot}
          tone="geo"
        />
        <Kpi
          label="Fiches de leads"
          value={leads.length}
          sub="Importées ou saisies avec leur origine"
          icon={Users}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Couverture Search Console : {coverage(metrics, "gsc").label}. Les totaux concernent
        uniquement les données importées ; les dates et sites manquants ne sont pas estimés.
      </p>
      <section>
        <div className="mb-4 flex justify-between">
          <h2 className="text-lg font-semibold">Vos sites et leurs sources</h2>
          <Link to="/sites" className="text-sm text-primary">
            Inventaire public →
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {sites.map((site) => {
            const conn = connections.sites.find((c) => c.site_id === site.id);
            return (
              <article key={site.id} className="card-surface flex flex-col p-5">
                <Globe2 className="mb-4 size-6 text-primary" />
                <h3 className="font-bold">{site.name}</h3>
                <a
                  className="mt-1 break-all text-xs text-primary hover:underline"
                  href={site.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {site.host} ↗
                </a>
                <p className="my-4 min-h-14 text-sm leading-6 text-muted-foreground">
                  {site.focus}
                </p>
                <div className="mt-auto space-y-2 border-t pt-4 text-xs">
                  <p>
                    Search Console :{" "}
                    <b>
                      {conn?.gsc_synced_at
                        ? "synchronisé"
                        : conn?.gsc_property
                          ? "à synchroniser"
                          : "non connecté"}
                    </b>
                  </p>
                  <p>
                    GA4 :{" "}
                    <b>
                      {conn?.ga4_synced_at
                        ? "synchronisé"
                        : conn?.ga4_property
                          ? "à synchroniser"
                          : "non connecté"}
                    </b>
                  </p>
                  <p>
                    {all.keywords.filter((k) => k.siteId === site.id).length} cibles et requêtes
                    suivies
                  </p>
                </div>
                <Button asChild variant="outline" className="mt-5">
                  <Link to="/sites" onClick={() => setSiteScope(site.id)}>
                    Analyser ce site
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </article>
            );
          })}
        </div>
      </section>
      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <Panel
          title="Trafic organique vérifié"
          description={
            stats.searchKnown
              ? `${metrics?.startDate} au ${metrics?.endDate} · Search Console`
              : "Aucune source de trafic synchronisée"
          }
        >
          {stats.searchKnown ? (
            <>
              <AreaDuo
                data={stats.days}
                a={{ key: "impressions", name: "Impressions", color: C[0] }}
                b={{ key: "clicks", name: "Clics", color: C[1] }}
              />
              <p className="mt-4 text-xs text-muted-foreground">
                Les sites non synchronisés sont exclus. La couverture des dates et les limites des
                sources figurent dans Connexions.
              </p>
            </>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
              <Search className="size-9 text-muted-foreground/40" />
              <p className="max-w-sm text-sm text-muted-foreground">
                Connectez Search Console pour afficher les impressions, clics et positions. Aucun
                chiffre théorique ne remplace ces données.
              </p>
              <Button asChild>
                <Link to="/connexions">Connecter Google</Link>
              </Button>
            </div>
          )}
        </Panel>
        <Panel
          title="Priorités de l’équipe"
          description="Actions documentées, responsables à attribuer"
          action={<NewActionDialog />}
        >
          <div className="space-y-4">
            {priorities.map((a) => (
              <div key={a.id} className="border-b pb-4 last:border-0">
                <div className="mb-2 flex gap-2">
                  <Badge variant={a.priority === "Critique" ? "danger" : "warning"}>
                    {a.priority}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{a.category}</span>
                </div>
                <Link to="/actions" className="text-sm font-semibold hover:text-primary">
                  {a.title}
                </Link>
                <p className="mt-2 text-xs text-muted-foreground">
                  {a.owner || "À attribuer"} · {a.due || "Échéance à définir"}
                </p>
              </div>
            ))}
          </div>
          <Button asChild variant="ghost" className="mt-3 w-full">
            <Link to="/actions">Voir toutes les actions →</Link>
          </Button>
        </Panel>
      </div>
      <Panel title="Comment lire le GEO ?">
        <div className="grid gap-5 text-sm leading-6 md:grid-cols-3">
          <div>
            <h3 className="font-semibold">1. Visibilité IA</h3>
            <p className="text-muted-foreground">
              Une question, une réponse observée, un moteur, une date et une preuve.{" "}
              {geoTests.length} observation(s) documentée(s).
            </p>
          </div>
          <div>
            <h3 className="font-semibold">2. Trafic depuis les IA</h3>
            <p className="text-muted-foreground">
              {stats.aiSessions === null
                ? "GA4 non synchronisé."
                : `${nf(stats.aiSessions)} session(s) attribuée(s) aux référents IA identifiés.`}{" "}
              Ces visites ne sont pas des leads.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">3. Leads attribués</h3>
            <p className="text-muted-foreground">
              {leads.filter((l) => l.source === "GEO").length} fiche(s) GEO avec origine documentée.
              Consultez chaque preuve dans Leads & Conversions.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
