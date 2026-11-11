import { SITES } from "@/lib/demo/sites";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { GeoRecordDialog } from "@/components/geo/GeoRecordDialog";
import { NativeSelect } from "@/components/shared/FormField";
import { Badge } from "@/components/ui/badge";
import { pageHead } from "@/lib/head";
import { useDemo } from "@/lib/demo/store";
import { PLATFORMS } from "@/lib/demo/seed";
import { fdatetime, pct } from "@/lib/demo/utils";
import { Kpi, PageHeader, Panel, Field } from "@/components/shared/ui";
import { GeoBadge } from "@/components/shared/badges";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { DataTable } from "@/components/shared/DataTable";
import { Bars } from "@/components/charts/charts";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { NewActionDialog } from "@/components/actions/NewActionDialog";
export const Route = createFileRoute("/geo")({
  head: pageHead(
    "GEO Intelligence",
    "Analysez les mentions de marque dans les réponses IA simulées.",
  ),
  component: GeoPage,
});
function GeoPage() {
  const { geoTests, workspace, leads } = useDemo();
  const [origin, setOrigin] = useState(workspace === "ambs" ? "Saisie manuelle" : "Simulation");
  const [platform, setPlatform] = useState("all"),
    [status, setStatus] = useState("all"),
    [selected, setSelected] = useState<string | null>(null);
  const rows = geoTests.filter(
    (t) =>
      (t.origin ?? "Simulation") === origin &&
      (platform === "all" || t.platform === platform) &&
      (status === "all" || t.status === status),
  );
  const current = geoTests.find((t) => t.id === selected);
  const previous = current
    ? [...geoTests]
        .filter(
          (t) =>
            t.promptId === current.promptId &&
            t.platform === current.platform &&
            (t.origin ?? "Simulation") === (current.origin ?? "Simulation") &&
            t.date < current.date,
        )
        .sort((a, b) => b.date.localeCompare(a.date))[0]
    : undefined;
  const cited = rows.filter((t) =>
    t.sources.some((source) => {
      try {
        const host = new URL(
          source.startsWith("http") ? source : `https://${source}`,
        ).hostname.replace(/^www\./, "");
        return SITES.some((site) => site.host === host);
      } catch {
        return false;
      }
    }),
  ).length;
  const ratio = (count: number) => (rows.length ? pct((count / rows.length) * 100, 0) : "—");
  return (
    <div className="space-y-6">
      <PageHeader
        geo
        title="GEO Intelligence"
        description="Comprenez comment votre marque apparaît dans les réponses des moteurs IA. Séparez vos observations manuelles des tests de démonstration."
        actions={
          <>
            <GeoRecordDialog onSaved={() => setOrigin("Saisie manuelle")} />
            <Button asChild>
              <Link to="/prompts">Gérer les prompts</Link>
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
        <label htmlFor="geo-origin" className="text-sm font-semibold">
          Données affichées
        </label>
        <div className="w-56">
          <NativeSelect
            id="geo-origin"
            options={["Simulation", "Saisie manuelle"]}
            value={origin}
            onChange={(e) => {
              setOrigin(e.target.value);
              setSelected(null);
            }}
          />
        </div>
        <Badge variant={origin === "Simulation" ? "demo" : "info"}>
          {origin === "Simulation" ? "Résultats fictifs" : "Observations saisies par votre équipe"}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Tests avec citation AMBS" value={cited} tone="geo" />
        <Kpi
          label="Leads attribués au GEO"
          value={leads.filter((l) => l.source === "GEO").length}
        />
        <Kpi label="Tests affichés" value={rows.length} />
        <Kpi
          label="Taux de mention"
          value={ratio(rows.filter((t) => t.mentioned).length)}
          tone="geo"
        />
        <Kpi
          label="Recommandations"
          value={ratio(rows.filter((t) => t.recommended).length)}
          tone="success"
        />
        <Kpi
          label="Réponses incorrectes"
          value={rows.filter((t) => t.accuracy === "Incorrecte").length}
          tone="danger"
        />
      </div>
      <Panel
        title="Présence par moteur IA"
        description="Part des tests filtrés qui mentionnent AMBS (%)"
      >
        <Bars
          data={PLATFORMS.map((p) => {
            const tests = rows.filter((t) => t.platform === p);
            return {
              label: p,
              mentions: tests.length
                ? Math.round((tests.filter((t) => t.mentioned).length / tests.length) * 100)
                : 0,
            };
          })}
          bars={[{ key: "mentions", name: "Taux de mention (%)", color: "var(--geo)" }]}
          layout="vertical"
        />
      </Panel>
      <DataTable
        rows={rows}
        label="Rechercher un test"
        search={(t) => t.question}
        filters={
          <>
            <FilterSelect
              label="Plateforme"
              value={platform}
              onChange={setPlatform}
              options={PLATFORMS}
              className="w-[205px]"
            />
            <FilterSelect
              label="Statut"
              value={status}
              onChange={setStatus}
              options={[
                "Mentionnée et recommandée",
                "Mentionnée sans recommandation",
                "Non mentionnée",
                "Réponse incorrecte",
              ]}
              className="w-[245px]"
            />
          </>
        }
        columns={[
          {
            label: "Question",
            render: (t) => (
              <button
                className="min-w-64 max-w-lg text-left font-medium hover:text-primary"
                onClick={() => setSelected(t.id)}
              >
                {t.question}
              </button>
            ),
          },
          { label: "Plateforme", sort: (t) => t.platform, render: (t) => t.platform },
          { label: "Résultat", render: (t) => <GeoBadge s={t.status} /> },
          { label: "Date", sort: (t) => t.date, render: (t) => fdatetime(t.date) },
          {
            label: "Réponse",
            render: (t) => (
              <Button size="sm" variant="outline" onClick={() => setSelected(t.id)}>
                Consulter
              </Button>
            ),
          },
        ]}
      />
      <Sheet open={!!current} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          {current && (
            <>
              <SheetHeader>
                <SheetTitle>{current.question}</SheetTitle>
                <SheetDescription>
                  {current.platform} · {fdatetime(current.date)} · {current.origin ?? "Simulation"}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <GeoBadge s={current.status} />
                <div className="rounded-md border p-3 text-sm">
                  <p className="font-semibold">Évolution du même prompt sur ce moteur</p>
                  {previous ? (
                    <p className="mt-1 text-muted-foreground">
                      {fdatetime(previous.date)} : {previous.status} → {current.status}
                    </p>
                  ) : (
                    <p className="mt-1 text-muted-foreground">
                      Aucune observation antérieure comparable.
                    </p>
                  )}
                </div>
                {current.evidenceUrl && /^https?:\/\//.test(current.evidenceUrl) && (
                  <a
                    href={current.evidenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-sm text-primary underline"
                  >
                    Consulter la preuve du test
                  </a>
                )}
                <p className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm leading-relaxed">
                  {current.response}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Exactitude">{current.accuracy}</Field>
                  <Field label="Position de mention">{current.mentionPosition ?? "Absente"}</Field>
                  <Field label="Sources citées">{current.sources.join(", ") || "Aucune"}</Field>
                  <Field label="Concurrents cités">{current.competitors.join(", ")}</Field>
                </div>
                <NewActionDialog
                  defaults={{
                    title: `Améliorer la réponse : ${current.question}`,
                    promptId: current.promptId,
                    category: "GEO",
                    target: current.platform,
                    kpi: "Taux de mention IA",
                  }}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
