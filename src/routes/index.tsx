import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Bot, CheckCircle2, Eye, EyeOff, FileText, KeyRound, Link2, Swords, Wand2, MousePointerClick } from "lucide-react";
import { useDemo, PERIOD_DAYS, PERIOD_LABEL } from "@/lib/demo/store";
import { ACTIVITIES } from "@/lib/demo/seed";
import { change, nf, pct, positionBuckets, seriesFor, windowStats } from "@/lib/demo/utils";
import { Delta, DemoBadge, Kpi, Panel } from "@/components/shared/ui";
import { C, Donut, LegendList, LinesChart } from "@/components/charts/charts";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vue générale — AMBS Visibility Hub" },
      { name: "description", content: "Pilotage SEO et GEO d'AMBS Agency : mots-clés, visibilité IA, actions et leads." },
      { property: "og:title", content: "Vue générale — AMBS Visibility Hub" },
      { property: "og:description", content: "Pilotage SEO et GEO d'AMBS Agency." },
    ],
  }),
  component: Overview,
});

const SERIES = [
  { key: "impressions", name: "Impressions Google", color: C[0], axis: "left" as const },
  { key: "clicks", name: "Clics organiques", color: C[1], axis: "right" as const },
  { key: "firstPage", name: "Mots-clés en 1re page", color: C[2], axis: "right" as const },
  { key: "geo", name: "Présence GEO (%)", color: "var(--geo)", axis: "right" as const },
];
const ICONS = { file: FileText, wand: Wand2, bot: Bot, swords: Swords, link: Link2 };

function Overview() {
  const { period, keywords, geoTests, actions } = useDemo();
  const days = PERIOD_DAYS[period];
  const [shown, setShown] = useState<string[]>(SERIES.map((s) => s.key));
  const now = windowStats(days), prev = windowStats(days, days);
  const visible = keywords.filter((k) => k.position !== null).length;
  const invisible = keywords.length - visible;
  const mentions = geoTests.filter((t) => t.mentioned).length;
  const done = actions.filter((a) => a.status === "Terminé").length;
  const data = useMemo(() => seriesFor(days), [days]);
  const buckets = positionBuckets(keywords);
  const geo = {
    tests: geoTests.length, mentions, reco: geoTests.filter((t) => t.recommended).length,
    citations: geoTests.filter((t) => t.sources.includes("ambs-agency.fr")).length,
    none: geoTests.filter((t) => !t.mentioned).length,
  };

  return (
    <div className="space-y-6">
      <div className="card-surface flex flex-col gap-3 border-l-4 border-l-primary p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Bonjour, bienvenue sur votre espace de pilotage.</h1>
          <p className="mt-1 text-sm text-muted-foreground">Suivez les performances SEO, la visibilité dans les moteurs IA et les actions stratégiques d'AMBS.</p>
        </div>
        <div className="flex flex-col items-start gap-1.5 md:items-end">
          <DemoBadge />
          <span className="text-xs text-muted-foreground">Période : <b className="text-foreground">{PERIOD_LABEL[period]}</b></span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Mots-clés suivis" value={keywords.length} icon={KeyRound} sub="Expressions stratégiques suivies." delta={<Delta value={12} />} />
        <Kpi label="Mots-clés visibles" value={visible} icon={Eye} tone="success" sub="Expressions avec une position mesurable."
          extra={<div className="space-y-1"><Progress value={(visible / keywords.length) * 100} className="h-1.5" /><span className="text-[11px] text-muted-foreground">Couverture {pct((visible / keywords.length) * 100, 0)}</span></div>} />
        <Kpi label="Mots-clés non visibles" value={invisible} icon={EyeOff} tone="danger" sub="Expressions sans visibilité détectée."
          extra={<span className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive"><AlertTriangle className="size-3" />{pct((invisible / keywords.length) * 100, 0)} du plan à traiter</span>} />
        <Kpi label="Impressions Google" value={nf(now.impressions)} icon={MousePointerClick} delta={<Delta value={days === 30 ? 18.4 : change(now.impressions, prev.impressions)} />} sub={`vs période précédente`} />
        <Kpi label="Présence dans les réponses IA" value={pct((mentions / geoTests.length) * 100, 0)} icon={Bot} tone="geo" sub="Tests GEO avec mention d'AMBS." />
        <Kpi label="Actions réalisées" value={`${done}/${actions.length}`} icon={CheckCircle2} sub="Avancement du plan stratégique."
          extra={<Progress value={(done / actions.length) * 100} className="h-1.5" />} />
      </div>

      <Panel title="Évolution de la visibilité" description={PERIOD_LABEL[period]} action={
        <div className="flex flex-wrap gap-1.5">
          {SERIES.map((s) => {
            const on = shown.includes(s.key);
            return (
              <button key={s.key} onClick={() => setShown(on ? shown.filter((x) => x !== s.key) : [...shown, s.key])}
                className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition", on ? "bg-card font-medium" : "bg-muted text-muted-foreground opacity-60")}>
                <span className="size-2 rounded-full" style={{ background: s.color }} />{s.name}
              </button>
            );
          })}
        </div>
      }>
        <LinesChart data={data} series={SERIES.filter((s) => shown.includes(s.key))} height={300} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Répartition des positions" description={`${keywords.length} mots-clés suivis`}>
          <Donut data={buckets} colors={[C[0], C[1], C[2], C[4], C[5], "var(--destructive)"]} height={180} />
          <div className="mt-4"><LegendList data={buckets} colors={[C[0], C[1], C[2], C[4], C[5], "var(--destructive)"]} /></div>
        </Panel>

        <Panel title="État GEO" description="Synthèse des tests simulés" action={<Button asChild variant="ghost" size="sm"><Link to="/geo">Détail</Link></Button>}>
          <div className="space-y-3">
            {[
              ["Tests GEO effectués", geo.tests, 100],
              ["Mentions d'AMBS", geo.mentions, (geo.mentions / geo.tests) * 100],
              ["Recommandations d'AMBS", geo.reco, (geo.reco / geo.tests) * 100],
              ["Citations de ambs-agency.fr", geo.citations, (geo.citations / geo.tests) * 100],
              ["Prompts sans résultat positif", geo.none, (geo.none / geo.tests) * 100],
            ].map(([l, v, p], i) => (
              <div key={l as string}>
                <div className="mb-1 flex justify-between text-sm"><span className="text-muted-foreground">{l}</span><b className="tabular">{v as number}</b></div>
                <div className="h-1.5 rounded-full bg-muted"><div className={cn("h-full rounded-full", i === 4 ? "bg-destructive/70" : "bg-geo")} style={{ width: `${p}%` }} /></div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Activités récentes">
          <ul className="space-y-4">
            {ACTIVITIES.map((a) => {
              const I = ICONS[a.icon as keyof typeof ICONS];
              return (
                <li key={a.text} className="flex gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground"><I className="size-4" /></span>
                  <div className="min-w-0"><p className="text-sm font-medium leading-snug">{a.text}</p><p className="text-xs text-muted-foreground">{a.who} · {a.when}</p></div>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
