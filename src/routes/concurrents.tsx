import { ExternalTracking } from "@/components/shared/ExternalTracking";
import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";

import { useDemo } from "@/lib/demo/store";
import { pct } from "@/lib/demo/utils";
import { PageHeader, Panel } from "@/components/shared/ui";
import { Bars, C } from "@/components/charts/charts";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { NewActionDialog } from "@/components/actions/NewActionDialog";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/concurrents")({
  head: pageHead("Concurrents", "Comparez les indicateurs SEO et GEO de démonstration."),
  component: CompetitorsPage,
});
function CompetitorsPage() {
  const { keywords, geoTests: allGeoTests, workspace, competitors } = useDemo();
  const geoTests = allGeoTests.filter((test) => (test.origin ?? "Simulation") === "Simulation");
  const ownSeo = keywords.length
    ? (keywords.filter((k) => k.position !== null).length / keywords.length) * 100
    : 0;
  const ownGeo = geoTests.length
    ? (geoTests.filter((t) => t.mentioned).length / geoTests.length) * 100
    : 0;
  const data = [
    { label: "AMBS Agency", seo: Math.round(ownSeo), geo: Math.round(ownGeo) },
    ...competitors.map((c) => ({ label: c.name, seo: c.seoVisibility, geo: c.geoPresence })),
  ];
  if (workspace === "ambs") return <ExternalTracking kind="competitors" />;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Concurrents"
        description="Comparez votre couverture SEO et votre présence IA. Les concurrents et leurs indicateurs sont fictifs."
      />
      <Panel
        title="Visibilité comparée"
        description="SEO : couverture des mots-clés · GEO : taux de mention (%)"
      >
        <Bars
          data={data}
          layout="vertical"
          height={330}
          bars={[
            { key: "seo", name: "Couverture SEO (%)", color: C[0] },
            { key: "geo", name: "Présence GEO (%)", color: "var(--geo)" },
          ]}
        />
      </Panel>
      <DataTable
        rows={competitors}
        search={(c) => `${c.name} ${c.topTerms.join(" ")}`}
        label="Rechercher un concurrent"
        columns={[
          {
            label: "Concurrent",
            render: (c) => (
              <div className="min-w-44">
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.site}</p>
              </div>
            ),
          },
          {
            label: "Mots-clés communs",
            sort: (c) => c.commonKeywords,
            render: (c) => c.commonKeywords,
          },
          {
            label: "Part de voix",
            sort: (c) => c.shareOfVoice,
            render: (c) => (c.shareOfVoice === null ? "—" : pct(c.shareOfVoice, 0)),
          },
          { label: "Citations IA", sort: (c) => c.aiCitations, render: (c) => c.aiCitations },
          {
            label: "Expressions fortes",
            render: (c) => (
              <div className="flex min-w-64 max-w-sm flex-wrap gap-1">
                {c.topTerms.map((t) => (
                  <Badge variant="muted" key={t}>
                    {t}
                  </Badge>
                ))}
              </div>
            ),
          },
          {
            label: "Analyse",
            render: (c) => (
              <NewActionDialog
                defaults={{
                  title: `Analyser les opportunités face à ${c.name}`,
                  target: c.name,
                  category: "SEO",
                  deliverable: "Analyse concurrentielle",
                }}
                trigger={
                  <Button size="sm" variant="outline">
                    Créer une action
                  </Button>
                }
              />
            ),
          },
        ]}
      />
    </div>
  );
}
