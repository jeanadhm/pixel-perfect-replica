import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, FolderPlus, Plus, Search, TrendingDown, TrendingUp } from "lucide-react";
import { pageHead } from "@/lib/head";
import { uid, useDemo } from "@/lib/demo/store";
import { fdate, kwStatus, kwTrend, nf } from "@/lib/demo/utils";
import type { Intent, Keyword } from "@/lib/demo/types";
import { Kpi, PageHeader, Panel, SortHead, useSorter, Field, Empty } from "@/components/shared/ui";
import { KwBadge } from "@/components/shared/badges";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { LinesChart, C } from "@/components/charts/charts";
import { NewActionDialog } from "@/components/actions/NewActionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mots-cles")({
  head: pageHead("Mots-clés", "Suivez la visibilité des 240 expressions stratégiques d'AMBS."),
  component: KeywordsPage,
});

type SK = "term" | "family" | "intent" | "position" | "previous" | "trend" | "volume" | "difficulty" | "status";
const POS = ["Top 3", "4 – 10", "11 – 20", "21 – 50", "> 50", "Non positionné"] as const;
const DIFF = ["Facile (< 30)", "Moyenne (30 – 60)", "Difficile (> 60)"] as const;
const EVO = ["En progression", "En régression", "Stable"] as const;
const PAGE_SIZE = 25;

const posBucket = (p: number | null) => p === null ? "Non positionné" : p <= 3 ? "Top 3" : p <= 10 ? "4 – 10" : p <= 20 ? "11 – 20" : p <= 50 ? "21 – 50" : "> 50";
const diffBucket = (d: number) => d < 30 ? DIFF[0] : d <= 60 ? DIFF[1] : DIFF[2];
const evo = (k: Keyword) => { const t = kwTrend(k); return t > 0 ? EVO[0] : t < 0 ? EVO[1] : EVO[2]; };

function KeywordsPage() {
  const { keywords, families } = useDemo();
  const [q, setQ] = useState("");
  const [f, setF] = useState({ family: "all", intent: "all", status: "all", pos: "all", diff: "all", evo: "all" });
  const [sort, setSort] = useState<{ key: SK; dir: 1 | -1 }>({ key: "volume", dir: -1 });
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const setFilter = (k: keyof typeof f) => (v: string) => { setF((s) => ({ ...s, [k]: v })); setPage(0); };
  const onSort = (key: SK) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "term" || key === "position" ? 1 : -1 }));

  const filtered = useMemo(() => keywords.filter((k) =>
    (!q || k.term.toLowerCase().includes(q.toLowerCase()) || k.url.includes(q.toLowerCase())) &&
    (f.family === "all" || k.family === f.family) && (f.intent === "all" || k.intent === f.intent) &&
    (f.status === "all" || kwStatus(k) === f.status) && (f.pos === "all" || posBucket(k.position) === f.pos) &&
    (f.diff === "all" || diffBucket(k.difficulty) === f.diff) && (f.evo === "all" || evo(k) === f.evo)), [keywords, q, f]);
  const rows = useSorter(filtered, sort, (k, key) => key === "trend" ? kwTrend(k) : key === "status" ? kwStatus(k) : (k[key as keyof Keyword] as string | number | null));
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  const visible = keywords.filter((k) => k.position !== null).length;
  const up = keywords.filter((k) => kwTrend(k) > 0).length;
  const down = keywords.filter((k) => kwTrend(k) < 0).length;
  const current = keywords.find((k) => k.id === openId) ?? null;
  const active = Object.values(f).some((v) => v !== "all") || q;

  return (
    <>
      <PageHeader title="Gestion des mots-clés" description="Suivez la visibilité de chaque expression stratégique et identifiez les opportunités de référencement."
        actions={<><NewFamilyDialog /><AddKeywordDialog /></>} />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Total des mots-clés" value={keywords.length} />
        <Kpi label="Visibles" value={visible} tone="success" />
        <Kpi label="Non visibles" value={keywords.length - visible} tone="danger" />
        <Kpi label="En progression" value={up} icon={TrendingUp} tone="success" />
        <Kpi label="En régression" value={down} icon={TrendingDown} tone="danger" />
      </div>

      <Tabs defaultValue="list">
        <TabsList><TabsTrigger value="list">Liste des mots-clés</TabsTrigger><TabsTrigger value="families">Familles ({families.length})</TabsTrigger></TabsList>
        <TabsContent value="list" className="mt-4">
          <div className="card-surface">
            <div className="flex flex-wrap items-center gap-2 border-b p-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input placeholder="Rechercher un mot-clé ou une URL…" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} className="h-9 pl-8" />
              </div>
              <FilterSelect label="Famille" value={f.family} onChange={setFilter("family")} options={families} className="w-[190px]" />
              <FilterSelect label="Intention" value={f.intent} onChange={setFilter("intent")} options={["Informationnelle", "Commerciale", "Transactionnelle"]} />
              <FilterSelect label="Statut" value={f.status} onChange={setFilter("status")} options={["Visible", "Faible visibilité", "Invisible"]} />
              <FilterSelect label="Position" value={f.pos} onChange={setFilter("pos")} options={POS} className="w-[150px]" />
              <FilterSelect label="Difficulté" value={f.diff} onChange={setFilter("diff")} options={DIFF} />
              <FilterSelect label="Évolution" value={f.evo} onChange={setFilter("evo")} options={EVO} />
              {active && <Button variant="ghost" size="sm" onClick={() => { setQ(""); setF({ family: "all", intent: "all", status: "all", pos: "all", diff: "all", evo: "all" }); }}>Réinitialiser</Button>}
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="text-xs">
                  <TableHead><SortHead label="Mot-clé" k="term" sort={sort} onSort={onSort} /></TableHead>
                  <TableHead><SortHead label="Famille" k="family" sort={sort} onSort={onSort} /></TableHead>
                  <TableHead><SortHead label="Intention" k="intent" sort={sort} onSort={onSort} /></TableHead>
                  <TableHead className="text-right"><SortHead label="Position" k="position" sort={sort} onSort={onSort} /></TableHead>
                  <TableHead className="text-right"><SortHead label="Précédente" k="previous" sort={sort} onSort={onSort} /></TableHead>
                  <TableHead className="text-right"><SortHead label="Évol." k="trend" sort={sort} onSort={onSort} /></TableHead>
                  <TableHead className="text-right"><SortHead label="Volume" k="volume" sort={sort} onSort={onSort} /></TableHead>
                  <TableHead><SortHead label="Difficulté" k="difficulty" sort={sort} onSort={onSort} /></TableHead>
                  <TableHead>URL cible</TableHead>
                  <TableHead><SortHead label="Statut" k="status" sort={sort} onSort={onSort} /></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pageRows.map((k) => {
                    const t = kwTrend(k), s = kwStatus(k);
                    return (
                      <TableRow key={k.id} onClick={() => setOpenId(k.id)} className={cn("cursor-pointer text-sm", s === "Invisible" && "bg-destructive/[0.03]")}>
                        <TableCell className="font-medium"><span className={cn("mr-2 inline-block size-1.5 rounded-full align-middle", s === "Invisible" ? "bg-destructive" : s === "Visible" ? "bg-success" : "bg-warning")} />{k.term}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{k.family}</TableCell>
                        <TableCell className="text-muted-foreground">{k.intent}</TableCell>
                        <TableCell className="text-right font-semibold tabular">{k.position ?? <span className="text-destructive">—</span>}</TableCell>
                        <TableCell className="text-right text-muted-foreground tabular">{k.previous ?? "—"}</TableCell>
                        <TableCell className={cn("text-right text-xs font-semibold tabular", t > 0 ? "text-success" : t < 0 ? "text-destructive" : "text-muted-foreground")}>{t > 0 ? `▲ ${t}` : t < 0 ? `▼ ${-t}` : "="}</TableCell>
                        <TableCell className="text-right tabular">{nf(k.volume)}</TableCell>
                        <TableCell><DiffBar d={k.difficulty} /></TableCell>
                        <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">{k.url.replace("https://", "")}</TableCell>
                        <TableCell><KwBadge s={s} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {!rows.length && <Empty />}
            </div>
            <div className="flex items-center justify-between border-t px-4 py-2.5 text-xs text-muted-foreground">
              <span>{rows.length} mot(s)-clé(s) · page {page + 1}/{pages}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Précédent</Button>
                <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Suivant</Button>
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="families" className="mt-4"><Families onPick={(fam) => { setF((s) => ({ ...s, family: fam })); toast(`Filtre appliqué : ${fam}`, { description: "Revenez à l'onglet Liste." }); }} /></TabsContent>
      </Tabs>

      <Sheet open={!!current} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">{current && <KeywordDetail k={current} />}</SheetContent>
      </Sheet>
    </>
  );
}

function DiffBar({ d }: { d: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 rounded-full bg-muted"><div className={cn("h-full rounded-full", d < 30 ? "bg-success" : d <= 60 ? "bg-warning" : "bg-destructive")} style={{ width: `${d}%` }} /></div>
      <span className="text-xs tabular text-muted-foreground">{d}</span>
    </div>
  );
}

function KeywordDetail({ k }: { k: Keyword }) {
  const { update } = useDemo();
  const [notes, setNotes] = useState(k.notes);
  const s = kwStatus(k);
  const recos = k.position === null
    ? ["Créer ou enrichir une page dédiée ciblant l'expression.", "Ajouter des liens internes depuis les pages solutions.", "Rédiger une FAQ répondant à l'intention de recherche."]
    : k.position > 10
      ? ["Optimiser la balise title et le H1 avec l'expression exacte.", "Enrichir le contenu (exemples, chiffres, cas clients).", "Obtenir 2 à 3 backlinks thématiques vers l'URL cible."]
      : ["Consolider la position : mettre à jour le contenu tous les 3 mois.", "Améliorer le CTR avec une meta description plus incitative."];
  return (
    <>
      <SheetHeader><SheetTitle className="pr-6 text-lg">{k.term}</SheetTitle></SheetHeader>
      <div className="mt-2 flex flex-wrap gap-2"><KwBadge s={s} /><Badge variant="muted">{k.family}</Badge><Badge variant="info">{k.intent}</Badge></div>
      <div className="mt-5 grid grid-cols-3 gap-4">
        <Field label="Position actuelle"><span className="text-xl font-bold">{k.position ?? "—"}</span></Field>
        <Field label="Volume estimé">{nf(k.volume)} / mois</Field>
        <Field label="Difficulté"><DiffBar d={k.difficulty} /></Field>
        <Field label="Position précédente">{k.previous ?? "—"}</Field>
        <Field label="Dernière vérification">{fdate(k.lastCheck)}</Field>
        <Field label="URL cible"><a href={k.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Ouvrir <ExternalLink className="size-3" /></a></Field>
      </div>
      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold">Historique des positions (12 semaines)</h3>
        {k.position === null ? <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">Aucune position détectée sur la période (au-delà du top 100).</p>
          : <LinesChart data={k.history.map((h) => ({ label: h.week, position: h.position }))} series={[{ key: "position", name: "Position", color: C[0] }]} height={180} reversed />}
      </div>
      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold">Concurrents positionnés <span className="font-normal text-muted-foreground">(fictifs)</span></h3>
        <ul className="divide-y rounded-md border text-sm">{k.competitors.map((c) => <li key={c.name} className="flex justify-between px-3 py-2"><span>{c.name}</span><span className="font-semibold tabular">#{c.position}</span></li>)}</ul>
      </div>
      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold">Actions recommandées</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{recos.map((r) => <li key={r}>{r}</li>)}</ul>
      </div>
      <div className="mt-6 space-y-2">
        <Label>Notes</Label>
        <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ajouter une note…" />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => { update("keywords", (ks) => ks.map((x) => x.id === k.id ? { ...x, notes } : x)); toast.success("Note enregistrée"); }}>Enregistrer la note</Button>
          <NewActionDialog defaults={{ title: `Optimiser « ${k.term} »`, category: "SEO", target: k.term, kpi: "Position moyenne", deliverable: "Page optimisée" }} trigger={<Button size="sm"><Plus className="size-4" />Ajouter une action SEO</Button>} />
        </div>
      </div>
    </>
  );
}

function Families({ onPick }: { onPick: (f: string) => void }) {
  const { keywords, families } = useDemo();
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {families.map((fam) => {
        const ks = keywords.filter((k) => k.family === fam);
        const vis = ks.filter((k) => k.position !== null);
        const top10 = vis.filter((k) => k.position! <= 10).length;
        const vol = ks.reduce((s, k) => s + k.volume, 0);
        const cov = ks.length ? (vis.length / ks.length) * 100 : 0;
        return (
          <button key={fam} onClick={() => onPick(fam)} className="card-surface p-4 text-left transition hover:border-primary/40">
            <div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{fam}</h3><Badge variant="muted">{ks.length} mots-clés</Badge></div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div><div className="text-xs text-muted-foreground">Visibles</div><b>{vis.length}</b></div>
              <div><div className="text-xs text-muted-foreground">Top 10</div><b>{top10}</b></div>
              <div><div className="text-xs text-muted-foreground">Volume</div><b>{nf(vol)}</b></div>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${cov}%` }} /></div>
            <div className="mt-1 text-[11px] text-muted-foreground">Couverture {Math.round(cov)} %</div>
          </button>
        );
      })}
    </div>
  );
}

function NewFamilyDialog() {
  const { update, families } = useDemo();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const save = () => {
    const n = name.trim();
    if (!n) return toast.error("Nom requis");
    if (families.includes(n)) return toast.error("Cette famille existe déjà");
    update("families", (f) => [...f, n]); toast.success(`Famille « ${n} » créée`); setName(""); setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline"><FolderPlus className="size-4" />Nouvelle famille</Button></DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Nouvelle famille de mots-clés</DialogTitle></DialogHeader>
        <Input autoFocus placeholder="Ex. Chatbot Instagram" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
        <DialogFooter><Button onClick={save}>Créer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddKeywordDialog() {
  const { update, families } = useDemo();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ term: "", family: families[0], intent: "Commerciale" as Intent, volume: "100", difficulty: "30", url: "https://ambs-agency.fr/" });
  const save = () => {
    if (!f.term.trim()) return toast.error("Le mot-clé est obligatoire");
    const k: Keyword = {
      id: uid("kw"), term: f.term.trim().toLowerCase(), family: f.family, intent: f.intent, position: null, previous: null,
      volume: Number(f.volume) || 0, difficulty: Math.min(100, Number(f.difficulty) || 0), url: f.url,
      history: Array.from({ length: 12 }, (_, i) => ({ week: `S${i + 35}`, position: null })), competitors: [], lastCheck: new Date().toISOString(), notes: "",
    };
    update("keywords", (ks) => [k, ...ks]); toast.success("Mot-clé ajouté", { description: "Il sera vérifié lors du prochain suivi de positions." }); setOpen(false);
    setF((s) => ({ ...s, term: "" }));
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="size-4" />Ajouter un mot-clé</Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Ajouter un mot-clé</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label>Expression</Label><Input value={f.term} onChange={(e) => setF({ ...f, term: e.target.value })} placeholder="ex. chatbot whatsapp immobilier" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Famille</Label><Select value={f.family} onValueChange={(v) => setF({ ...f, family: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{families.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-1.5"><Label>Intention</Label><Select value={f.intent} onValueChange={(v) => setF({ ...f, intent: v as Intent })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Informationnelle", "Commerciale", "Transactionnelle"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-1.5"><Label>Volume estimé</Label><Input type="number" value={f.volume} onChange={(e) => setF({ ...f, volume: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Difficulté (0-100)</Label><Input type="number" value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })} /></div>
          </div>
          <div className="grid gap-1.5"><Label>URL cible</Label><Input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={save}>Ajouter</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
