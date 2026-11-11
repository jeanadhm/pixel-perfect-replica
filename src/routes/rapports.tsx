import { siteLabel } from "@/lib/demo/sites";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, FileText, Table2 } from "lucide-react";
import { toast } from "sonner";
import { keywordExportRows, keywordPlan } from "@/lib/demo/workflow";
import { pageHead } from "@/lib/head";
import { PERIOD_DAYS, PERIOD_LABEL, useDemo } from "@/lib/demo/store";
import { exportCsv, exportPdf } from "@/lib/demo/export";
import { nf, pct, eur, windowStats } from "@/lib/demo/utils";
import { PageHeader, Panel, Field } from "@/components/shared/ui";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/rapports")({
  head: pageHead("Rapports", "Exportez une synthèse des données de démonstration."),
  component: ReportsPage,
});
function ReportsPage() {
  const { period, keywords, geoTests, actions, pages, leads, audits, workspace, siteScope } =
    useDemo();
  const [busy, setBusy] = useState(false);
  const traffic = windowStats(PERIOD_DAYS[period], 0, siteScope);
  const simulated = geoTests.filter((t) => (t.origin ?? "Simulation") === "Simulation");
  const manual = geoTests.filter((t) => t.origin === "Saisie manuelle");
  const mentions = simulated.filter((t) => t.mentioned).length;
  const sections = [
    {
      heading: `Perimetre : ${siteLabel(siteScope)}`,
      lines: [
        workspace === "demo"
          ? "Demonstration : statistiques SEO, GEO, leads et audits fictifs. Seuls les liens et observations HTML du catalogue sont reels."
          : "Suivi manuel local. Aucune base de donnees.",
      ],
    },
    {
      heading: "Plan SEO - suivi local",
      lines: [
        `Mots-cles a cibler : ${keywords.filter((k) => keywordPlan(k).stage === "À cibler").length}`,
        `Mots-cles integres : ${keywords.filter((k) => keywordPlan(k).stage === "Intégré").length}`,
        `Mots-cles avec releves saisis ou simules : ${keywords.filter((k) => k.measurements?.length).length}`,
        `Actions avec resultat renseigne : ${actions.filter((a) => a.result != null).length}`,
      ],
    },
    {
      heading: "GEO - observations manuelles uniquement",
      lines: [
        `Observations : ${manual.length}`,
        `Taux de mention : ${manual.length ? pct((manual.filter((t) => t.mentioned).length / manual.length) * 100) : "Non mesure"}`,
        `Recommandations : ${manual.filter((t) => t.recommended).length}`,
      ],
    },
    {
      heading: `SEO - ${PERIOD_LABEL[period]}`,
      lines: [
        `Impressions : ${nf(traffic.impressions)}`,
        `Clics organiques : ${nf(traffic.clicks)}`,
        `Taux de clics : ${pct(traffic.ctr)}`,
        `Position moyenne : ${nf(traffic.position, 1)}`,
      ],
    },
    {
      heading: "Visibilite - dernier etat disponible",
      lines: [
        `Mots-cles suivis : ${keywords.length}`,
        `Mots-cles positionnes : ${keywords.filter((k) => k.position !== null).length}`,
        `Pages indexees : ${pages.filter((p) => p.indexed === "Indexée").length}/${pages.length}`,
      ],
    },
    {
      heading: "GEO - ensemble des tests simules",
      lines: [
        `Tests : ${simulated.length}`,
        `Taux de mention : ${pct(simulated.length ? (mentions / simulated.length) * 100 : 0)}`,
        `Recommandations : ${simulated.filter((t) => t.recommended).length}`,
      ],
    },
    {
      heading: "Actions et business - toutes dates",
      lines: [
        `Actions terminees : ${actions.filter((a) => a.status === "Terminé").length}/${actions.length}`,
        `Leads : ${leads.length}`,
        `Clients : ${leads.filter((l) => l.status === "Client").length}`,
        `Valeur des clients saisis : ${eur(leads.filter((l) => l.status === "Client").reduce((s, l) => s + l.value, 0))}`,
      ],
    },
  ].filter(
    (section) =>
      workspace === "demo" ||
      (!section.heading.startsWith("SEO - ") &&
        section.heading !== "GEO - ensemble des tests simules"),
  );
  const downloadPdf = async () => {
    setBusy(true);
    try {
      await exportPdf(
        "Rapport AMBS - SEO et GEO",
        sections,
        workspace === "demo"
          ? "DONNÉES DE DÉMONSTRATION"
          : "SUIVI LOCAL - SAISIES MANUELLES ET PLAN À VALIDER",
      );
    } catch {
      toast.error("Le PDF n’a pas pu être généré. Réessayez.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapports"
        description="Préparez vos points de suivi et exportez les données de votre espace."
        actions={
          <Button onClick={downloadPdf} disabled={busy}>
            <Download className="size-4" />
            {busy ? "Génération…" : "Télécharger le rapport PDF"}
          </Button>
        }
      />
      <Panel
        title="Aperçu du rapport"
        description={
          workspace === "demo"
            ? "Données de démonstration · trafic jusqu’au 10 novembre 2026"
            : "Données saisies localement · aucune collecte automatique"
        }
      >
        <div className="grid gap-6 sm:grid-cols-2">
          {sections.map((s) => (
            <div key={s.heading}>
              <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <FileText className="size-4 text-primary" />
                {s.heading}
              </h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {s.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>
      <Panel
        title="Exports détaillés"
        description="CSV compatible avec les tableurs. Les listes sont exportées dans leur ensemble."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              label: "Mots-clés",
              count: keywords.length,
              run: () => exportCsv("mots-cles", keywordExportRows(keywords)),
            },
            {
              label: "Tests GEO (tous)",
              count: geoTests.length,
              run: () =>
                exportCsv(
                  "tests-geo",
                  geoTests.map((t) => ({
                    date: t.date,
                    question: t.question,
                    plateforme: t.platform,
                    statut: t.status,
                    origine: t.origin ?? "Simulation",
                    sources: t.sources.join(", "),
                    reponse: t.response,
                  })),
                ),
            },
            {
              label: "Actions",
              count: actions.length,
              run: () =>
                exportCsv(
                  "actions",
                  actions.map((a) => ({ ...a })),
                ),
            },
            {
              label: "Pages",
              count: pages.length,
              run: () =>
                exportCsv(
                  "pages",
                  pages.map((p) => ({ ...p })),
                ),
            },
            {
              label: "Relevés SEO manuels",
              count: keywords.reduce((total, k) => total + (k.measurements?.length ?? 0), 0),
              run: () =>
                exportCsv(
                  "releves-seo",
                  keywords.flatMap((k) =>
                    (k.measurements ?? []).map((m) => ({ expression: k.term, ...m })),
                  ),
                ),
            },
            {
              label: "Leads",
              count: leads.length,
              run: () =>
                exportCsv(
                  "leads",
                  leads.map((l) => ({ ...l })),
                ),
            },
            {
              label: "Contrôles SEO/GEO",
              count: audits.length,
              run: () =>
                exportCsv(
                  "controles-seo-geo",
                  audits.map((a) => ({ ...a })),
                ),
            },
            {
              label: "Trafic SEO",
              count: workspace === "demo" ? traffic.slice.length : 0,
              run: () =>
                exportCsv(
                  "trafic-seo",
                  workspace === "demo" ? traffic.slice.map((p) => ({ ...p })) : [],
                ),
            },
          ].map((item) => (
            <div
              className="flex items-center justify-between gap-3 rounded-lg border p-4"
              key={item.label}
            >
              <Field label={item.label}>{item.count} lignes</Field>
              <Button
                variant="outline"
                size="sm"
                aria-label={`Exporter ${item.label}`}
                onClick={item.run}
              >
                <Table2 className="size-4" />
                CSV
              </Button>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
