import { createFileRoute, Link } from "@tanstack/react-router";
import { WorkspaceOverview } from "@/components/layout/WorkspaceOverview";
import { pageHead } from "@/lib/head";
import { PERIOD_DAYS, PERIOD_LABEL, useDemo } from "@/lib/demo/store";
import { change, nf, pct, positionBuckets, seriesFor, windowStats } from "@/lib/demo/utils";
import { Delta, Kpi, PageHeader, Panel } from "@/components/shared/ui";
import { AreaDuo, C, Donut, LegendList, LinesChart } from "@/components/charts/charts";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
export const Route = createFileRoute("/seo")({
  head: pageHead("SEO Performance", "Analysez votre visibilité organique."),
  component: SeoPage,
});
function SeoPage() {
  const { period, keywords, pages, workspace } = useDemo();
  const days = PERIOD_DAYS[period],
    now = windowStats(days),
    prev = windowStats(days, days);
  const compare = prev.slice.length === now.slice.length;
  const buckets = positionBuckets(keywords),
    data = seriesFor(days);
  if (workspace === "ambs") return <WorkspaceOverview seo />;
  return (
    <div className="space-y-6">
      <PageHeader
        title="SEO Performance"
        description={`Comprenez ce qui attire vos visiteurs depuis Google · ${PERIOD_LABEL[period]}.`}
        actions={
          <Button asChild variant="outline">
            <Link to="/mots-cles">Voir les mots-clés</Link>
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Impressions"
          value={nf(now.impressions)}
          delta={compare ? <Delta value={change(now.impressions, prev.impressions)} /> : undefined}
        />
        <Kpi
          label="Clics organiques"
          value={nf(now.clicks)}
          delta={compare ? <Delta value={change(now.clicks, prev.clicks)} /> : undefined}
        />
        <Kpi label="Taux de clics" value={pct(now.ctr)} />
        <Kpi
          label="Position moyenne"
          value={nf(now.position, 1)}
          sub="Une valeur plus basse est meilleure."
        />
      </div>
      <Panel title="Trafic depuis Google" description="Données simulées jusqu’au 10 novembre 2026">
        <AreaDuo
          data={data}
          a={{ key: "impressions", name: "Impressions", color: C[0] }}
          b={{ key: "clicks", name: "Clics", color: C[1] }}
        />
      </Panel>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Répartition des positions" description="État actuel des mots-clés">
          <Donut data={buckets} />
          <LegendList data={buckets} />
        </Panel>
        <Panel title="Progression du référencement">
          <LinesChart
            data={data}
            series={[{ key: "position", name: "Position moyenne", color: C[0] }]}
            reversed
            height={300}
          />
          <p className="mt-4 text-xs text-muted-foreground">
            La période sélectionnée s’applique aux courbes de trafic. Les listes représentent le
            dernier état disponible.
          </p>
        </Panel>
      </div>
      <div>
        <h2 className="mb-3 font-semibold">Pages les plus consultées · dernier relevé</h2>
        <DataTable
          rows={[...pages].sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0))}
          search={(p) => p.name}
          label="Rechercher une page"
          columns={[
            {
              label: "Page",
              render: (p) => (
                <Link to="/pages" className="font-medium hover:text-primary">
                  {p.name}
                </Link>
              ),
            },
            { label: "Clics", sort: (p) => p.clicks, render: (p) => nf(p.clicks) },
            { label: "Score SEO", sort: (p) => p.score, render: (p) => `${p.score}/100` },
            { label: "Indexation", render: (p) => p.indexed },
          ]}
        />
      </div>
    </div>
  );
}
