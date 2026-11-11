"use client";
import { useDemo } from "@/lib/demo/store";
import { Link } from "@/components/navigation";
import { summarize, coverage } from "@/lib/api/metrics";
import { nf, pct, positionBuckets } from "@/lib/demo/utils";
import { PageHeader, Kpi, Panel } from "@/components/shared/ui";
import { Button } from "@/components/ui/button";
import { AreaDuo, C, Donut, LegendList } from "@/components/charts/charts";
import { DataTable } from "@/components/shared/DataTable";
export default function SeoPage() {
  const { metrics, keywords } = useDemo();
  const s = summarize(metrics),
    measured = keywords.filter((k) => k.lastCheck),
    buckets = positionBuckets(measured);
  return (
    <div className="space-y-6">
      <PageHeader
        title="SEO · données Search Console"
        description="Impressions et clics issus des relevés Google, séparés des cibles du plan de mots-clés."
        actions={
          <Button asChild variant="outline">
            <Link to="/connexions">Sources et synchronisation</Link>
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Impressions" value={nf(s.impressions)} />
        <Kpi label="Clics" value={nf(s.clicks)} />
        <Kpi label="Taux de clics" value={s.ctr === null ? "—" : pct(s.ctr)} />
        <Kpi label="Position moyenne" value={nf(s.position, 1)} />
      </div>
      <p className="text-xs text-muted-foreground">
        {coverage(metrics, "gsc").label}. Les totaux portent sur cette couverture, sans
        extrapolation aux dates ou sites absents.
      </p>
      <Panel
        title="Trafic Google"
        description={
          s.searchKnown
            ? `${metrics?.startDate} → ${metrics?.endDate} · domaines synchronisés uniquement`
            : "Aucun relevé disponible"
        }
      >
        {s.searchKnown ? (
          <AreaDuo
            data={s.days}
            a={{ key: "impressions", name: "Impressions", color: C[0] }}
            b={{ key: "clicks", name: "Clics", color: C[1] }}
          />
        ) : (
          <div className="py-16 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              Connectez la propriété Search Console du site, puis lancez la première
              synchronisation.
            </p>
            <Button asChild>
              <Link to="/connexions">Configurer Search Console</Link>
            </Button>
          </div>
        )}
      </Panel>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title="Expressions mesurées"
          description={`${measured.length} mesurées sur ${keywords.length} expressions du plan`}
        >
          {measured.length ? (
            <>
              <Donut data={buckets} />
              <LegendList data={buckets} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Les mots-clés du cahier des charges sont des cibles, pas des positions acquises.
            </p>
          )}
        </Panel>
        <Panel title="Provenance et couverture">
          <ul className="space-y-3 text-sm text-muted-foreground">
            {metrics?.runs
              .filter((r) => r.provider === "gsc")
              .slice(0, 4)
              .map((r, i) => (
                <li key={i}>
                  <b>{r.site_id}</b> · {r.start_date} → {r.end_date}
                  <br />
                  {r.message}
                </li>
              ))}
            {!s.searchKnown && (
              <li>Aucune propriété n’a encore fourni de relevé pour la période affichée.</li>
            )}
          </ul>
        </Panel>
      </div>
      <DataTable
        rows={measured}
        search={(k) => k.term + " " + k.url}
        label="Rechercher une requête mesurée"
        columns={[
          { label: "Expression", render: (k) => <span className="font-medium">{k.term}</span> },
          { label: "Position moyenne", render: (k) => nf(k.position, 1) },
          {
            label: "Page",
            render: (k) => (
              <a
                className="break-all text-primary underline"
                href={k.url}
                target="_blank"
                rel="noreferrer"
              >
                {k.url}
              </a>
            ),
          },
          { label: "Dernier relevé", render: (k) => k.lastCheck },
        ]}
      />
    </div>
  );
}
