import { useRouterState } from "@tanstack/react-router";
import { Bell, Download } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PERIOD_LABEL, PERIOD_DAYS, useDemo, type Period } from "@/lib/demo/store";
import { TODAY } from "@/lib/demo/seed";
import { exportCsv } from "@/lib/demo/export";
import { kwStatus, kwTrend, windowStats } from "@/lib/demo/utils";
import { keywordExportRows } from "@/lib/demo/workflow";
import { NAV } from "./nav";
export function AppHeader() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const {
    period,
    setPeriod,
    keywords,
    actions,
    geoTests,
    prompts,
    pages,
    leads,
    audits,
    workspace,
    siteScope,
    backlinks,
    competitors,
  } = useDemo();
  const current = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group }))).find(
    (i) => i.url === path,
  );
  const regressions = keywords.filter((k) => kwTrend(k) < 0).length;
  const due = actions.filter((a) => {
    const time = new Date(a.due).getTime() - (workspace === "demo" ? TODAY.getTime() : Date.now());
    return a.status !== "Terminé" && time >= 0 && time <= 2 * 86400000;
  }).length;
  const notifs = [
    { text: `${regressions} mots-clés en régression au dernier relevé`, color: "text-destructive" },
    {
      text: `${geoTests.filter((t) => t.accuracy === "Incorrecte").length} réponses IA à corriger`,
      color: "text-geo",
    },
    {
      text: `${due} actions arrivent à échéance sous 48 h`,
      color: "text-muted-foreground",
    },
  ];
  const exportCurrent = () => {
    if (path === "/audit")
      return exportCsv(
        "controles-seo-geo",
        audits.map((a) => ({ ...a })),
      );
    if (workspace === "ambs" && (path === "/" || path === "/seo"))
      return exportCsv(
        "releves-seo",
        keywords.flatMap((k) => (k.measurements ?? []).map((m) => ({ expression: k.term, ...m }))),
      );
    if (path === "/actions")
      return exportCsv(
        "actions",
        actions.map((a) => ({ ...a })),
      );
    if (path === "/geo")
      return exportCsv(
        "tests-geo",
        geoTests.map((t) => ({
          question: t.question,
          plateforme: t.platform,
          date: t.date,
          statut: t.status,
          origine: t.origin ?? "Simulation",
          reponse: t.response,
        })),
      );
    if (path === "/prompts")
      return exportCsv(
        "prompts",
        prompts.map((p) => ({ ...p })),
      );
    if (path === "/pages")
      return exportCsv(
        "pages",
        pages.map((p) => ({ ...p })),
      );
    if (path === "/leads")
      return exportCsv(
        "leads",
        leads.map((l) => ({ ...l })),
      );
    if (path === "/backlinks")
      return exportCsv(
        "backlinks",
        backlinks.map((b) => ({ ...b })),
      );
    if (path === "/concurrents")
      return exportCsv(
        "concurrents",
        competitors.map((c) => ({
          ...c,
          topTerms: c.topTerms.join(", "),
        })),
      );
    if (path === "/" || path === "/seo")
      return exportCsv(
        "trafic-seo",
        windowStats(PERIOD_DAYS[period], 0, siteScope).slice.map((p) => ({ ...p })),
      );
    return exportCsv("mots-cles", keywordExportRows(keywords));
  };
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-card/95 px-3 backdrop-blur sm:gap-3 sm:px-4">
      <SidebarTrigger />
      <nav
        aria-label="Fil d’Ariane"
        className="hidden min-w-0 items-center gap-1.5 text-sm sm:flex"
      >
        <span className="text-muted-foreground">{current?.group ?? "AMBS"}</span>
        <span className="text-muted-foreground/50">/</span>
        <span className="truncate font-semibold">{current?.title ?? "Page"}</span>
      </nav>
      <div className="ml-auto flex items-center gap-2">
        {workspace === "demo" && ["/", "/seo", "/rapports"].includes(path) ? (
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger
              aria-label="Période d’analyse SEO"
              className="h-9 w-[155px] sm:w-[170px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {PERIOD_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-muted-foreground">
            {workspace === "demo" ? "Démo locale" : "Suivi AMBS"}
          </span>
        )}
        {!["/parametres", "/rapports", "/sites"].includes(path) && (
          <Button
            variant="outline"
            size="sm"
            title="Exporter toutes les lignes de cette rubrique"
            className="hidden h-9 md:inline-flex"
            onClick={exportCurrent}
          >
            <Download className="size-4" />
            Exporter
          </Button>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="size-4" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-destructive" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-0">
            <div className="border-b px-4 py-2.5 text-sm font-semibold">Notifications de suivi</div>
            {notifs.map((n) => (
              <div key={n.text} className={`border-b px-4 py-3 text-sm last:border-0 ${n.color}`}>
                {n.text}
              </div>
            ))}
          </PopoverContent>
        </Popover>
        <div
          className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          aria-label={workspace === "demo" ? "Profil de démonstration Sarah Benali" : "Équipe AMBS"}
        >
          {workspace === "demo" ? "SB" : "AM"}
        </div>
      </div>
    </header>
  );
}
