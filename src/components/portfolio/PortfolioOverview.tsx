import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  ArrowRight,
  Globe2,
  Link2,
  Bot,
  ListChecks,
  CheckCircle2,
} from "lucide-react";
import { useDemo, PERIOD_DAYS } from "@/lib/demo/store";
import { SITES, siteLabel } from "@/lib/demo/sites";
import { PUBLIC_PAGES, PUBLIC_CHECKED_AT } from "@/lib/demo/public-pages";
import { nf, pct, windowStats, seriesFor } from "@/lib/demo/utils";
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
    pages,
    period,
    snapshot,
    workspace,
  } = useDemo();
  const all = snapshot();
  const shownSites = SITES.filter((s) => siteScope === "all" || s.id === siteScope);
  const records = PUBLIC_PAGES.filter((p) =>
    shownSites.some((s) => new URL(p.url).hostname === s.host),
  );
  const issues = records.filter((p) => p.status !== 200);
  const stats = windowStats(PERIOD_DAYS[period], 0, siteScope);
  const mentioned = geoTests.filter((t) => t.mentioned).length;
  const priorities = [...actions]
    .filter((a) => a.status !== "Terminé")
    .sort(
      (a, b) =>
        ["Critique", "Haute", "Moyenne", "Basse"].indexOf(a.priority) -
          ["Critique", "Haute", "Moyenne", "Basse"].indexOf(b.priority) ||
        a.due.localeCompare(b.due),
    )
    .slice(0, 4);
  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-2xl bg-[#123e35] p-6 text-white md:p-9">
        <div className="relative grid items-center gap-7 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-emerald-200">
              <span className="size-1.5 rounded-full bg-emerald-300" /> Visibility Hub
            </p>
            <h1 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              {siteScope === "all" ? "Vos sites. Une vision claire." : siteLabel(siteScope)}
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-emerald-50/80">
              Pilotez votre présence sur Google et dans les IA. Identifiez ce qui mérite votre
              attention, puis passez à l’action.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="bg-white text-[#123e35] hover:bg-emerald-50">
                <Link to="/sites">
                  Explorer les sites <ArrowUpRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/actions">
                  Plan d’action <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5 rounded-xl border border-white/15 bg-white/5 p-5">
            <div>
              <span className="text-4xl font-semibold tabular">
                {shownSites.length.toString().padStart(2, "0")}
              </span>
              <p className="mt-1 text-xs text-emerald-100/70">sites dans le périmètre</p>
            </div>
            <div>
              <span className="text-4xl font-semibold tabular">{records.length}</span>
              <p className="mt-1 text-xs text-emerald-100/70">URL publiques inventoriées</p>
            </div>
            <p className="col-span-2 border-t border-white/15 pt-3 text-xs text-emerald-100/80">
              Inventaire observé le {PUBLIC_CHECKED_AT.split("-").reverse().join("/")}
              <br />
              Analyse du HTML public ; rendu JavaScript non audité.
            </p>
          </div>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi
          label="Liens accessibles"
          value={`${records.filter((p) => p.status === 200).length}/${records.length}`}
          sub="Réponses HTTP observées"
          icon={Link2}
          tone="success"
        />
        <Kpi
          label="Mots-clés intégrés"
          value={`${keywords.filter((k) => k.plan?.stage === "Intégré").length}/${keywords.length}`}
          sub={workspace === "demo" ? "Plan de démonstration" : "Plan de travail"}
          icon={CheckCircle2}
        />
        <Kpi
          label="Présence dans les IA"
          value={geoTests.length ? pct((mentioned / geoTests.length) * 100) : "À mesurer"}
          sub={workspace === "demo" ? "Réponses IA simulées" : "Observations saisies"}
          icon={Bot}
          tone="geo"
        />
        <Kpi
          label="Actions à mener"
          value={actions.filter((a) => a.status !== "Terminé").length}
          sub={`${actions.filter((a) => a.status === "Terminé").length} terminées dans cet espace`}
          icon={ListChecks}
        />
      </div>
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Votre écosystème</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Une mission et un suivi distincts pour chaque site.
            </p>
          </div>
          <Button variant="ghost" asChild>
            <Link to="/sites">
              Tous les liens <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {shownSites.map((site, i) => {
            const sitePages = PUBLIC_PAGES.filter((p) => new URL(p.url).hostname === site.host);
            const siteKw = all.keywords.filter((k) => k.siteId === site.id);
            return (
              <article
                key={site.id}
                className="card-surface flex flex-col p-5 transition-shadow hover:shadow-md"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Globe2 className="size-5" />
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    0{SITES.indexOf(site) + 1} / {site.role}
                  </span>
                </div>
                <h3 className="text-base font-bold">{site.name}</h3>
                <a
                  href={site.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {site.host}
                  <ArrowUpRight className="size-3" />
                </a>
                <p className="mb-5 mt-4 min-h-14 text-sm leading-6 text-muted-foreground">
                  {site.focus}
                </p>
                <div className="mt-auto grid grid-cols-2 gap-2 border-t pt-4">
                  <div>
                    <b className="text-xl tabular">{sitePages.length}</b>
                    <p className="text-[11px] text-muted-foreground">URL inventoriées</p>
                  </div>
                  <div>
                    <b className="text-xl tabular">{siteKw.length}</b>
                    <p className="text-[11px] text-muted-foreground">mots-clés suivis</p>
                  </div>
                </div>
                <Button variant="outline" className="mt-5 justify-between" asChild>
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
        {workspace === "demo" ? (
          <Panel
            title="Trafic organique"
            description="Illustration fictive · aucune connexion Google Search Console"
            action={<Badge variant="demo">Simulation</Badge>}
          >
            <div className="mb-5 flex gap-8">
              <div>
                <p className="text-xs text-muted-foreground">Impressions</p>
                <b className="text-2xl tabular">{nf(stats.impressions)}</b>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Clics</p>
                <b className="text-2xl tabular">{nf(stats.clicks)}</b>
              </div>
            </div>
            <AreaDuo
              data={seriesFor(PERIOD_DAYS[period], siteScope)}
              a={{ key: "impressions", name: "Impressions", color: C[0] }}
              b={{ key: "clicks", name: "Clics", color: C[1] }}
            />
          </Panel>
        ) : (
          <Panel title="Couverture éditoriale">
            <p>
              {pages.length} pages et {keywords.length} expressions dans votre suivi manuel.
            </p>
            <Button asChild className="mt-5">
              <Link to="/mots-cles">Ouvrir le plan de mots-clés</Link>
            </Button>
          </Panel>
        )}
        <Panel
          title="Les prochaines priorités"
          description="Actions de l’espace sélectionné"
          action={<NewActionDialog />}
        >
          <div className="space-y-5">
            {priorities.map((a, i) => (
              <div className="flex gap-3 border-b pb-4 last:border-0" key={a.id}>
                <span className="pt-1 text-xs font-semibold text-muted-foreground">0{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex gap-2">
                    <Badge variant={a.priority === "Critique" ? "danger" : "warning"}>
                      {a.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{a.category}</span>
                  </div>
                  <Link
                    to="/actions"
                    className="text-sm font-semibold leading-6 hover:text-primary"
                  >
                    {a.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.owner} · {a.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Button asChild variant="ghost" className="mt-3 w-full">
            <Link to="/actions">
              Ouvrir le plan complet
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </Panel>
      </div>
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-warning/30 bg-warning/5 p-5 md:flex-row md:items-center">
        <div>
          <h2 className="text-sm font-semibold">Observations publiques à traiter</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {issues.length} URL en erreur dans ce périmètre. Les scores SEO et les contrôles
            détaillés restent des exemples à valider.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/sites">
            Consulter l’inventaire
            <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
