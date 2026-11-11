"use client";
import { useDemo } from "@/lib/demo/store";
import { summarize, coverage } from "@/lib/api/metrics";
import { siteLabel } from "@/lib/demo/sites";
import { exportCsv, exportPdf } from "@/lib/demo/export";
import { nf } from "@/lib/demo/utils";
import { PageHeader, Panel } from "@/components/shared/ui";
import { Button } from "@/components/ui/button";
export default function ReportsPage() {
  const { metrics, siteScope, keywords, geoTests, leads, actions, observations } = useDemo();
  const s = summarize(metrics);
  const sections = [
    {
      heading: "Périmètre et sources",
      lines: [
        siteLabel(siteScope),
        `Période demandée : ${metrics?.startDate ?? "—"} → ${metrics?.endDate ?? "—"}`,
        "Les sites ou dates non synchronisés ne sont pas extrapolés. Une donnée manquante n’est pas zéro.",
      ],
    },
    {
      heading: "Google Search Console",
      lines: [
        `Impressions : ${nf(s.impressions)}`,
        `Couverture : ${coverage(metrics, "gsc").label}`,
        `Clics : ${nf(s.clicks)}`,
        `Position moyenne : ${nf(s.position, 1)}`,
        ...(metrics?.runs
          .filter((r) => r.provider === "gsc")
          .slice(0, 4)
          .map((r) => `${r.site_id} : ${r.start_date} → ${r.end_date}. ${r.message}`) ?? []),
      ],
    },
    {
      heading: "Google Analytics 4",
      lines: [
        `Sessions : ${nf(s.sessions)}`,
        `Couverture : ${coverage(metrics, "ga4").label}`,
        `Événements clés : ${nf(s.keyEvents)} (pas des fiches de leads)`,
        `Sessions depuis référents IA identifiés : ${nf(s.aiSessions)}`,
      ],
    },
    {
      heading: "Suivi documenté",
      lines: [
        `${keywords.length} cibles et requêtes suivies`,
        `${geoTests.length} observations GEO avec preuve`,
        `${leads.length} fiches de leads importées ou saisies`,
        `${leads.filter((l) => l.source === "GEO").length} fiches avec attribution GEO documentée`,
        `${actions.filter((a) => a.status === "Terminé").length}/${actions.length} actions terminées`,
      ],
    },
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapports vérifiables"
        description="Exports du périmètre sélectionné, avec source, période et limites de mesure."
      />
      <Panel title="Synthèse SEO / GEO">
        <p className="text-sm text-muted-foreground">
          Le rapport distingue les données Google, les réponses IA observées et les fiches
          commerciales. Aucun chiffre de démonstration.
        </p>
        <Button
          className="mt-4"
          onClick={() =>
            void exportPdf(
              "Rapport AMBS",
              sections,
              "DONNÉES SOURCÉES · VALEURS ABSENTES NON ESTIMÉES",
            )
          }
        >
          Télécharger le rapport PDF
        </Button>
      </Panel>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { name: "Relevés Google", rows: metrics?.search ?? [] },
          { name: "Relevés GA4", rows: metrics?.analytics ?? [] },
          { name: "Leads et preuves", rows: leads },
          { name: "Observations GEO", rows: geoTests },
          { name: "Actions", rows: actions },
          { name: "Mots-clés", rows: keywords },
        ].map((item) => (
          <Panel key={item.name} title={item.name}>
            <p className="mb-4 text-sm text-muted-foreground">
              {item.rows.length} ligne(s) disponible(s)
            </p>
            <Button
              variant="outline"
              disabled={!item.rows.length}
              onClick={() =>
                exportCsv(
                  item.name,
                  item.rows.map((row) => ({ ...row })),
                )
              }
            >
              Exporter CSV
            </Button>
          </Panel>
        ))}
      </div>
    </div>
  );
}
