import { useRouterState } from "@tanstack/react-router";
import { Bell, Download } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PERIOD_LABEL, useDemo, type Period } from "@/lib/demo/store";
import { exportCsv } from "@/lib/demo/export";
import { kwStatus } from "@/lib/demo/utils";
import { NAV } from "./nav";

const NOTIFS = [
  { t: "12 mots-clés en régression cette semaine", c: "text-destructive" },
  { t: "AMBS mentionnée par Perplexity sur « agence WhatsApp »", c: "text-geo" },
  { t: "3 actions arrivent à échéance sous 48 h", c: "text-warning-foreground" },
];

export function AppHeader() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { period, setPeriod, keywords, actions } = useDemo();
  const current = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group }))).find((i) => (i.url === "/" ? path === "/" : path.startsWith(i.url)));

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur">
      <SidebarTrigger />
      <nav className="hidden min-w-0 items-center gap-1.5 text-sm sm:flex">
        <span className="text-muted-foreground">{current?.group ?? "AMBS"}</span>
        <span className="text-muted-foreground/50">/</span>
        <span className="truncate font-semibold">{current?.title ?? "Page"}</span>
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => <SelectItem key={p} value={p}>{PERIOD_LABEL[p]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="hidden h-9 md:inline-flex" onClick={() => path.startsWith("/actions")
          ? exportCsv("actions", actions.map(({ comments, ...a }) => a))
          : exportCsv("mots-cles", keywords.map((k) => ({ mot_cle: k.term, famille: k.family, position: k.position ?? "", volume: k.volume, statut: kwStatus(k) })))}>
          <Download className="size-4" /> Exporter
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="size-4" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-destructive" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="border-b px-4 py-2.5 text-sm font-semibold">Notifications</div>
            {NOTIFS.map((n) => <div key={n.t} className={`border-b px-4 py-3 text-sm last:border-0 ${n.c}`}>{n.t}</div>)}
          </PopoverContent>
        </Popover>
        <div className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">SB</div>
      </div>
    </header>
  );
}
