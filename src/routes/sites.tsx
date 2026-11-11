import { publicFindings, type PublicPage } from "@/lib/demo/public-audit";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ExternalLink, Download, ArrowRight } from "lucide-react";
import { useDemo } from "@/lib/demo/store";
import { SITES, siteForUrl } from "@/lib/demo/sites";
import { PUBLIC_PAGES, PUBLIC_CHECKED_AT } from "@/lib/demo/public-pages";
import { pageHead } from "@/lib/head";
import { PageHeader, Kpi, Panel } from "@/components/shared/ui";
import { DataTable } from "@/components/shared/DataTable";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { exportCsv } from "@/lib/demo/export";
import { NewActionDialog } from "@/components/actions/NewActionDialog";
export const Route = createFileRoute("/sites")({
  head: pageHead("Sites & Liens", "Inventaire public et analyse par site de l’écosystème AMBS."),
  component: SitesPage,
});
function SitesPage() {
  const { siteScope, setSiteScope, pages, keywords, actions, geoTests, workspace } = useDemo();
  const [selected, setSelected] = useState<PublicPage | null>(null);
  const [status, setStatus] = useState("all");
  const sites = SITES.filter((s) => siteScope === "all" || s.id === siteScope);
  const records = PUBLIC_PAGES.filter((p) => sites.some((s) => new URL(p.url).hostname === s.host));
  const rows = records
    .map((p) => ({ ...p, id: p.url }))
    .filter(
      (p) => status === "all" || (status === "HTTP 200" ? p.status === 200 : p.status !== 200),
    );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sites & Liens"
        description="L’inventaire réel de votre écosystème, les points à vérifier et les pistes d’amélioration de chaque site."
        actions={
          <Button
            variant="outline"
            onClick={() =>
              exportCsv(
                "inventaire-public-ambs",
                records.map(({ technical, ...r }) => ({
                  ...r,
                  ...technical,
                  points_a_verifier: publicFindings({ ...r, technical }).join(" | "),
                  date: PUBLIC_CHECKED_AT,
                })),
              )
            }
          >
            <Download className="size-4" />
            Exporter l’inventaire
          </Button>
        }
      />
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm leading-6">
        <strong>Observations réelles du 11 novembre 2026.</strong> URL, HTTP, title, description,
        H1, canonique, images, liens et blocs JSON-LD lus dans le HTML public. Un HTTP 200 ne prouve
        pas l’indexation. DialAgent charge son contenu en JavaScript : ses routes sont repérées dans
        la navigation, leur rendu et leurs balises finales restent à vérifier. Aucun espace privé
        n’a été analysé.
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Sites" value={sites.length} />
        <Kpi label="URL inventoriées" value={records.length} />
        <Kpi
          label="HTTP 200"
          value={records.filter((p) => p.status === 200).length}
          tone="success"
        />
        <Kpi
          label="URL en erreur"
          value={records.filter((p) => p.status !== 200).length}
          tone="danger"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {sites.map((site) => {
          const count = (items: { siteId?: string | undefined }[]) =>
            items.filter((i) => i.siteId === site.id).length;
          const observed = records.filter((p) => siteForUrl(p.url)?.id === site.id);
          const errors = observed.filter((p) => p.status !== 200).length;
          const html = observed.filter((p) => p.technical);
          const duplicateTitles = html.filter(
            (p) => p.title && html.some((other) => other.url !== p.url && other.title === p.title),
          ).length;
          return (
            <Panel
              key={site.id}
              title={site.name}
              description={site.focus}
              action={
                <a
                  href={site.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md p-1.5 text-primary hover:bg-muted"
                  aria-label={`Ouvrir ${site.name}`}
                >
                  <ExternalLink className="size-4" />
                </a>
              }
            >
              <a
                href={site.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary underline"
              >
                {site.host}
              </a>
              <div className="my-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <b>{count(keywords)}</b>
                  <p className="text-xs text-muted-foreground">mots-clés</p>
                </div>
                <div>
                  <b>{count(geoTests)}</b>
                  <p className="text-xs text-muted-foreground">
                    tests IA {workspace === "demo" ? "simulés" : "saisis"}
                  </p>
                </div>
                <div>
                  <b>{count(actions)}</b>
                  <p className="text-xs text-muted-foreground">actions</p>
                </div>
              </div>
              <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border p-3 text-xs">
                <p>
                  <b>{html.filter((p) => !p.meta).length}</b> descriptions absentes
                </p>
                <p>
                  <b>{duplicateTitles}</b> pages au title partagé
                </p>
                <p>
                  <b>{html.filter((p) => p.technical?.h1Count !== 1).length}</b> pages sans H1
                  unique
                </p>
                <p>
                  <b>{html.filter((p) => !p.technical?.canonical).length}</b> canoniques absentes
                </p>
                <p className="col-span-2 text-muted-foreground">
                  Constats sur le HTML initial de {html.length} pages, à confirmer après rendu et
                  selon l’intention de chaque page.
                </p>
              </div>
              <div className="rounded-lg bg-muted/60 p-3 text-sm leading-6">
                <p className="mb-1 font-semibold">Piste d’amélioration</p>
                {site.opportunity}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {observed.length} URL publiques · {errors} erreur(s) HTTP
                {site.id === "dialagent"
                  ? " · Contenu HTML initial limité : rendu JavaScript à contrôler."
                  : ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/seo" onClick={() => setSiteScope(site.id)}>
                    SEO
                    <ArrowRight className="size-3" />
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/geo" onClick={() => setSiteScope(site.id)}>
                    GEO
                    <ArrowRight className="size-3" />
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/mots-cles" onClick={() => setSiteScope(site.id)}>
                    Mots-clés
                  </Link>
                </Button>
              </div>
            </Panel>
          );
        })}
      </div>
      <div>
        <h2 className="mb-3 text-lg font-semibold">Toutes les URL publiques repérées</h2>
        <DataTable
          rows={rows}
          search={(p) => `${p.url} ${p.title} ${p.h1}`}
          label="Rechercher une URL ou un titre"
          filters={
            <FilterSelect
              label="Réponse HTTP"
              value={status}
              onChange={setStatus}
              options={["HTTP 200", "En erreur"]}
            />
          }
          columns={[
            {
              label: "Page / site",
              sort: (p) => p.url,
              render: (p) => (
                <div className="min-w-64 max-w-96">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-sm font-medium text-primary hover:underline"
                  >
                    {p.url}
                    <ExternalLink className="ml-1 inline size-3" />
                  </a>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {siteForUrl(p.url)?.name} · {p.source}
                  </p>
                </div>
              ),
            },
            {
              label: "HTTP observé",
              sort: (p) => p.status,
              render: (p) => (
                <Badge variant={p.status === 200 ? "success" : "danger"}>
                  {p.status || "Non vérifié"}
                </Badge>
              ),
            },
            {
              label: "Title / H1 observés",
              render: (p) => (
                <div className="min-w-60 max-w-md text-xs leading-5">
                  <p className="font-semibold">{p.title || "Title non relevé"}</p>
                  <p className="mt-1 line-clamp-3 text-muted-foreground" title={p.h1}>
                    {p.h1 || "H1 absent du HTML initial · rendu à vérifier"}
                  </p>
                </div>
              ),
            },
            {
              label: "Analyse HTML",
              render: (p) => (
                <Button variant="outline" size="sm" onClick={() => setSelected(p)}>
                  {publicFindings(p).length} point(s) à vérifier
                </Button>
              ),
            },
            {
              label: "À suivre",
              render: (p) => (
                <NewActionDialog
                  defaults={{
                    title: `${p.status === 200 ? "Vérifier les optimisations" : "Corriger le lien"} · ${p.name}`,
                    target: p.url,
                    pageId: pages.find((page) => page.url === p.url)?.id,
                    category: "SEO",
                    priority: p.status === 200 ? "Moyenne" : "Haute",
                    siteId: siteForUrl(p.url)?.id,
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
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Analyse du HTML public</SheetTitle>
                <SheetDescription>
                  Instantané du 11/11/2026. Pas de mesure de classement ni de trafic.
                </SheetDescription>
              </SheetHeader>
              <a
                href={selected.url}
                target="_blank"
                rel="noreferrer"
                className="my-5 block break-all text-sm text-primary underline"
              >
                {selected.url}
              </a>
              <dl className="space-y-4 text-sm">
                {[
                  ["HTTP", selected.status],
                  ["Title", selected.title],
                  ["Meta description", selected.meta],
                  ["H1", selected.h1],
                  ["Canonique", selected.technical?.canonical],
                  [
                    "Robots meta",
                    selected.technical?.robots || "Aucune directive explicite relevée",
                  ],
                  ["Nombre de H1", selected.technical?.h1Count],
                  ["Nombre de H2", selected.technical?.h2Count],
                  ["Liens internes HTML", selected.technical?.internalLinks],
                  ["Images sans attribut alt", selected.technical?.missingAltCount],
                  ["Blocs JSON-LD", selected.technical?.schemaBlocks],
                  ["Mots dans le HTML", selected.technical?.wordCount],
                ].map(([label, value]) => (
                  <div key={String(label)} className="border-b pb-3">
                    <dt className="mb-1 text-xs text-muted-foreground">{label}</dt>
                    <dd className="break-words">{value ?? "Non relevé"}</dd>
                  </div>
                ))}
              </dl>
              <h3 className="mb-3 mt-6 font-semibold">Points à vérifier</h3>
              <ul className="space-y-3 text-sm">
                {publicFindings(selected).map((finding) => (
                  <li key={finding} className="rounded-lg bg-warning/10 p-3">
                    {finding}
                  </li>
                ))}
              </ul>
              {!publicFindings(selected).length && (
                <p className="text-sm text-muted-foreground">
                  Aucun signal détecté par ces contrôles HTML limités. Les performances,
                  l’indexation et le rendu restent à auditer.
                </p>
              )}
              <div className="mt-6">
                <NewActionDialog
                  defaults={{
                    title: `Auditer le HTML · ${selected.name}`,
                    description: publicFindings(selected).join("\n"),
                    target: selected.url,
                    category: "SEO",
                    siteId: siteForUrl(selected.url)?.id,
                    pageId: pages.find((p) => p.url === selected.url)?.id,
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
