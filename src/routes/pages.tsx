import { PUBLIC_PAGES } from "@/lib/demo/public-pages";
import { SITES, siteLabel } from "@/lib/demo/sites";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { pageHead } from "@/lib/head";
import { useDemo, uid } from "@/lib/demo/store";
import type { SitePage } from "@/lib/demo/types";
import { PageHeader, Kpi, Field } from "@/components/shared/ui";
import { DataTable } from "@/components/shared/DataTable";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { FormField, NativeSelect } from "@/components/shared/FormField";
import { NewActionDialog } from "@/components/actions/NewActionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { fdate, nf } from "@/lib/demo/utils";
export const Route = createFileRoute("/pages")({
  head: pageHead("Pages & Contenus", "Suivez les contenus et leurs optimisations SEO."),
  component: PagesPage,
});
function PagesPage() {
  const { pages } = useDemo();
  const [status, setStatus] = useState("all"),
    [selected, setSelected] = useState<string | null>(null);
  const current = pages.find((p) => p.id === selected);
  return (
    <>
      <PageHeader
        title="Pages & Contenus"
        description="Centralisez les pages de votre site, leur indexation et les optimisations à préparer."
        actions={<NewPageDialog />}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Pages suivies" value={pages.length} />
        <Kpi
          label="Indexées"
          value={pages.filter((p) => p.indexed === "Indexée").length}
          tone="success"
        />
        <Kpi
          label="À optimiser (score < 60)"
          value={pages.filter((p) => p.score !== null && p.score < 60).length}
          tone="danger"
        />
        <Kpi
          label="Contenus adaptés aux IA"
          value={pages.filter((p) => p.geoContent).length}
          tone="geo"
        />
      </div>
      <DataTable
        rows={pages.filter((p) => status === "all" || p.published === status)}
        search={(p) => `${p.name} ${p.url} ${p.mainKeyword}`}
        label="Rechercher un contenu"
        filters={
          <FilterSelect
            label="Publication"
            value={status}
            onChange={setStatus}
            options={["À vérifier", "Publiée", "Brouillon", "À créer"]}
          />
        }
        columns={[
          {
            label: "Page",
            sort: (p) => p.name,
            render: (p) => (
              <button className="min-w-56 text-left" onClick={() => setSelected(p.id)}>
                <span className="font-semibold hover:text-primary">{p.name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {siteLabel(p.siteId ?? "ambs")} · {p.type}
                </span>
                <span className="mt-1 block max-w-72 truncate text-xs text-primary">{p.url}</span>
              </button>
            ),
          },
          {
            label: "Publication",
            render: (p) => (
              <Badge variant={p.published === "Publiée" ? "success" : "muted"}>{p.published}</Badge>
            ),
          },
          { label: "Indexation", render: (p) => p.indexed },
          {
            label: "Score SEO",
            sort: (p) => p.score,
            render: (p) => (
              <span
                className={
                  p.score !== null && p.score < 60
                    ? "font-semibold text-destructive"
                    : "font-semibold text-success"
                }
              >
                {p.score === null ? "À mesurer" : `${p.score}/100`}
              </span>
            ),
          },
          { label: "Clics", sort: (p) => p.clicks, render: (p) => nf(p.clicks) },
          { label: "Responsable", render: (p) => p.owner },
          {
            label: "Fiche",
            render: (p) => (
              <Button size="sm" variant="outline" onClick={() => setSelected(p.id)}>
                Optimiser
              </Button>
            ),
          },
        ]}
      />
      <Sheet open={!!current} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          {current && <PageEditor key={current.id} page={current} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
function PageEditor({ page }: { page: SitePage }) {
  const { update } = useDemo();
  const [draft, setDraft] = useState(page);
  const observed = PUBLIC_PAGES.find((p) => p.url === page.url);
  return (
    <>
      <SheetHeader>
        <SheetTitle>{page.name}</SheetTitle>
        <SheetDescription>
          Préparation locale : ces modifications ne publient rien sur le site AMBS.
        </SheetDescription>
      </SheetHeader>
      {observed && (
        <div className="mt-5 rounded-lg border bg-muted/40 p-3 text-xs leading-6">
          <strong>Observation publique du 11/11/2026 · HTTP {observed.status}</strong>
          <p>Title : {observed.title || "Non relevé"}</p>
          <p>H1 : {observed.h1 || "Absent du HTML initial ; rendu JavaScript à vérifier"}</p>
          <p>Les statistiques et contrôles de la démonstration sont fictifs.</p>
        </div>
      )}
      <div className="my-5 grid grid-cols-2 gap-4">
        <Field label="URL">
          <a
            className="break-all text-primary underline"
            href={page.url}
            target="_blank"
            rel="noreferrer"
          >
            {page.url}
          </a>
        </Field>
        <Field label="Dernière optimisation">{fdate(page.lastOptimized)}</Field>
        <Field label="Mot-clé principal">{page.mainKeyword}</Field>
        <Field label="Liens internes">{page.internalLinks}</Field>
      </div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.title.trim() || !draft.h1.trim())
            return void toast.error("Le title et le H1 sont obligatoires");
          update("pages", (items) => items.map((p) => (p.id === page.id ? draft : p)));
          toast.success("Fiche enregistrée localement");
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="État déclaré de publication">
            {(id) => (
              <NativeSelect
                id={id}
                options={["À vérifier", "À créer", "Brouillon", "Publiée"]}
                value={draft.published}
                onChange={(e) =>
                  setDraft({ ...draft, published: e.target.value as SitePage["published"] })
                }
              />
            )}
          </FormField>
          <FormField label="Indexation vérifiée">
            {(id) => (
              <NativeSelect
                id={id}
                options={["À vérifier", "Non indexée", "En attente", "Indexée"]}
                value={draft.indexed}
                onChange={(e) =>
                  setDraft({ ...draft, indexed: e.target.value as SitePage["indexed"] })
                }
              />
            )}
          </FormField>
        </div>
        <FormField label="URL définitive ou proposée">
          {(id) => (
            <Input
              id={id}
              type="url"
              required
              pattern="https?://.*"
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            />
          )}
        </FormField>
        <FormField label="Responsable éditorial">
          {(id) => (
            <Input
              id={id}
              value={draft.owner}
              onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
            />
          )}
        </FormField>
        <p className="text-xs text-muted-foreground">
          Les champs title, meta et H1 issus du référentiel sont des propositions. La publication et
          l’indexation doivent être vérifiées séparément.
        </p>
        <FormField label={`Balise title (${draft.title.length} caractères)`}>
          {(id) => (
            <Input
              id={id}
              required
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          )}
        </FormField>
        <FormField label={`Meta description (${draft.meta.length} caractères)`}>
          {(id) => (
            <Textarea
              id={id}
              value={draft.meta}
              onChange={(e) => setDraft({ ...draft, meta: e.target.value })}
            />
          )}
        </FormField>
        <FormField label="Titre H1">
          {(id) => (
            <Input
              id={id}
              required
              value={draft.h1}
              onChange={(e) => setDraft({ ...draft, h1: e.target.value })}
            />
          )}
        </FormField>
        <FormField label="Sous-titres H2">
          {(id) => (
            <Textarea
              id={id}
              value={draft.h2}
              onChange={(e) => setDraft({ ...draft, h2: e.target.value })}
            />
          )}
        </FormField>
        <FormField label="URL canonique">
          {(id) => (
            <Input
              id={id}
              type="url"
              pattern="https?://.*"
              value={draft.canonical}
              onChange={(e) => setDraft({ ...draft, canonical: e.target.value })}
            />
          )}
        </FormField>
        <FormField label="Données structurées prévues">
          {(id) => (
            <NativeSelect
              id={id}
              options={["À vérifier", "Organization", "Service", "FAQPage", "Article", "Aucune"]}
              value={draft.schema}
              onChange={(e) => setDraft({ ...draft, schema: e.target.value })}
            />
          )}
        </FormField>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.geoContent}
            onChange={(e) => setDraft({ ...draft, geoContent: e.target.checked })}
          />
          Contenu structuré pour les moteurs IA
        </label>
        <Button type="submit">Enregistrer la fiche</Button>
      </form>
      <div className="mt-6 border-t pt-5">
        <NewActionDialog
          defaults={{
            title: `Optimiser la page ${page.name}`,
            pageId: page.id,
            category: "SEO",
            target: page.url,
            deliverable: "Page optimisée",
          }}
        />
      </div>
    </>
  );
}

function NewPageDialog() {
  const { update, families, pages, siteScope } = useDemo();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    url: `${SITES.find((s) => s.id === siteScope)?.url ?? "https://ambs-agency.com"}/`,
    type: "Page solution" as SitePage["type"],
    family: families[0] ?? "",
    mainKeyword: "",
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nouvelle page à suivre</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une page au plan</DialogTitle>
          <DialogDescription>
            Crée une fiche de suivi uniquement. Aucune page n’est publiée sur le site.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.name.trim()) return;
            if (pages.some((p) => p.url.replace(/\/$/, "") === draft.url.replace(/\/$/, "")))
              return void toast.error("Cette URL est déjà suivie");
            const page: SitePage = {
              ...draft,
              id: uid("page"),
              keywordCount: 0,
              published: "À créer",
              indexed: "À vérifier",
              score: null,
              clicks: null,
              lastOptimized: "",
              owner: "À attribuer",
              title: "",
              meta: "",
              h1: "",
              h2: "",
              canonical: "",
              internalLinks: 0,
              schema: "À vérifier",
              geoContent: false,
            };
            update("pages", (items) => [page, ...items]);
            setOpen(false);
            setDraft({ ...draft, name: "", mainKeyword: "" });
            toast.success("Page ajoutée au suivi");
          }}
        >
          <FormField label="Nom de la nouvelle page">
            {(id) => (
              <Input
                id={id}
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            )}
          </FormField>
          <FormField label="URL cible">
            {(id) => (
              <Input
                id={id}
                required
                type="url"
                pattern="https?://.*"
                value={draft.url}
                onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              />
            )}
          </FormField>
          <FormField label="Type de contenu">
            {(id) => (
              <NativeSelect
                id={id}
                options={[
                  "Page solution",
                  "Page secteur",
                  "Étude de cas",
                  "Article de blog",
                  "Page institutionnelle",
                ]}
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as SitePage["type"] })}
              />
            )}
          </FormField>
          <FormField label="Famille">
            {(id) => (
              <NativeSelect
                id={id}
                options={families}
                value={draft.family}
                onChange={(e) => setDraft({ ...draft, family: e.target.value })}
              />
            )}
          </FormField>
          <FormField label="Mot-clé principal">
            {(id) => (
              <Input
                id={id}
                value={draft.mainKeyword}
                onChange={(e) => setDraft({ ...draft, mainKeyword: e.target.value })}
              />
            )}
          </FormField>
          <Button type="submit">Ajouter la page</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
