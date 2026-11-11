import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { uid, useDemo } from "@/lib/demo/store";
import type { Backlink, Competitor } from "@/lib/demo/types";
import { nf, fdate } from "@/lib/demo/utils";
import { PageHeader, Kpi } from "./ui";
import { FormField, NativeSelect } from "./FormField";
import { DataTable } from "./DataTable";
import { NewActionDialog } from "@/components/actions/NewActionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
function Editor({
  title,
  trigger,
  children,
  save,
}: {
  title: string;
  trigger?: ReactNode;
  children: ReactNode;
  save: (data: FormData) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button>{title}</Button>}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Renseignez uniquement les mesures connues. Les champs vides restent non mesurés ; aucun
            outil externe n’est interrogé.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!(await save(new FormData(e.currentTarget)))) return;
            setOpen(false);
            toast.success("Relevé enregistré");
          }}
        >
          {children}
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
const str = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const num = (data: FormData, key: string) =>
  str(data, key) === "" ? null : Number(str(data, key));
function BacklinkEditor({ item }: { item?: Backlink }) {
  const { update } = useDemo();
  return (
    <Editor
      title={item ? "Modifier le backlink" : "Ajouter un backlink"}
      trigger={
        item ? (
          <Button size="sm" variant="outline">
            Modifier
          </Button>
        ) : undefined
      }
      save={(data) => {
        const source = str(data, "source");
        const record: Backlink = {
          id: item?.id ?? uid("bl"),
          source,
          domain: new URL(source).hostname,
          target: str(data, "target"),
          authority: num(data, "authority"),
          date: str(data, "date"),
          type: str(data, "type") as Backlink["type"],
          status: str(data, "status") as Backlink["status"],
          quality: str(data, "quality") as Backlink["quality"],
        };
        return update("backlinks", (items) =>
          item ? items.map((x) => (x.id === item.id ? record : x)) : [record, ...items],
        );
      }}
    >
      <FormField label="URL source du backlink">
        {(id) => (
          <Input
            id={id}
            name="source"
            type="url"
            pattern="https?://.*"
            required
            defaultValue={item?.source ?? ""}
          />
        )}
      </FormField>
      <FormField label="Page AMBS ciblée">
        {(id) => (
          <Input
            id={id}
            name="target"
            type="url"
            pattern="https?://.*"
            required
            defaultValue={item?.target ?? "https://ambs-agency.com/"}
          />
        )}
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Date d’observation">
          {(id) => (
            <Input
              id={id}
              name="date"
              type="date"
              required
              defaultValue={item?.date ?? new Date().toISOString().slice(0, 10)}
            />
          )}
        </FormField>
        <FormField label="Autorité (0–100, optionnel)">
          {(id) => (
            <Input
              id={id}
              name="authority"
              type="number"
              min="0"
              max="100"
              defaultValue={item?.authority ?? ""}
            />
          )}
        </FormField>
        <FormField label="Type de lien">
          {(id) => (
            <NativeSelect
              id={id}
              name="type"
              options={["Dofollow", "Nofollow", "Sponsorisé", "UGC"]}
              defaultValue={item?.type ?? "Dofollow"}
            />
          )}
        </FormField>
        <FormField label="Statut du lien">
          {(id) => (
            <NativeSelect
              id={id}
              name="status"
              options={["En attente", "Actif", "Perdu"]}
              defaultValue={item?.status ?? "En attente"}
            />
          )}
        </FormField>
      </div>
      <FormField label="Qualité évaluée par l’équipe">
        {(id) => (
          <NativeSelect
            id={id}
            name="quality"
            options={["Excellente", "Bonne", "Moyenne", "Faible"]}
            defaultValue={item?.quality ?? "Moyenne"}
          />
        )}
      </FormField>
    </Editor>
  );
}
function CompetitorEditor({ item }: { item?: Competitor }) {
  const { update } = useDemo();
  return (
    <Editor
      title={item ? "Modifier le concurrent" : "Ajouter un concurrent"}
      trigger={
        item ? (
          <Button size="sm" variant="outline">
            Modifier
          </Button>
        ) : undefined
      }
      save={(data) => {
        const record: Competitor = {
          id: item?.id ?? uid("cp"),
          name: str(data, "name"),
          site: str(data, "site"),
          commonKeywords: num(data, "commonKeywords"),
          seoVisibility: num(data, "seoVisibility"),
          shareOfVoice: num(data, "shareOfVoice"),
          geoPresence: num(data, "geoPresence"),
          aiCitations: num(data, "aiCitations"),
          topTerms: str(data, "topTerms")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        };
        return update("competitors", (items) =>
          item ? items.map((x) => (x.id === item.id ? record : x)) : [record, ...items],
        );
      }}
    >
      <FormField label="Nom du concurrent">
        {(id) => <Input id={id} name="name" required defaultValue={item?.name ?? ""} />}
      </FormField>
      <FormField label="Site du concurrent">
        {(id) => (
          <Input
            id={id}
            name="site"
            type="url"
            pattern="https?://.*"
            required
            defaultValue={item?.site ?? ""}
          />
        )}
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ["commonKeywords", "Mots-clés communs"],
            ["seoVisibility", "Visibilité SEO (%)"],
            ["shareOfVoice", "Part de voix (%)"],
            ["geoPresence", "Présence GEO (%)"],
            ["aiCitations", "Citations IA"],
          ] as const
        ).map(([key, label]) => (
          <FormField key={key} label={label}>
            {(id) => (
              <Input
                id={id}
                name={key}
                type="number"
                min="0"
                step="any"
                max={
                  ["seoVisibility", "shareOfVoice", "geoPresence"].includes(key) ? 100 : undefined
                }
                defaultValue={item?.[key] ?? ""}
              />
            )}
          </FormField>
        ))}
      </div>
      <FormField label="Expressions fortes (séparées par des virgules)">
        {(id) => <Input id={id} name="topTerms" defaultValue={item?.topTerms.join(", ") ?? ""} />}
      </FormField>
    </Editor>
  );
}
export function ExternalTracking({ kind }: { kind: "backlinks" | "competitors" }) {
  const { backlinks, competitors } = useDemo();
  if (kind === "backlinks")
    return (
      <div className="space-y-6">
        <PageHeader
          title="Autorité & Backlinks"
          description="Documentez les liens observés et les opportunités à travailler, avec leur URL source."
          actions={<BacklinkEditor />}
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Liens suivis" value={backlinks.length} />
          <Kpi label="Domaines référents" value={new Set(backlinks.map((b) => b.domain)).size} />
          <Kpi
            label="Actifs"
            value={backlinks.filter((b) => b.status === "Actif").length}
            tone="success"
          />
          <Kpi
            label="Perdus"
            value={backlinks.filter((b) => b.status === "Perdu").length}
            tone="danger"
          />
        </div>
        <DataTable
          rows={backlinks}
          search={(b) => b.domain + " " + b.target}
          label="Rechercher un backlink"
          columns={[
            {
              label: "Domaine",
              render: (b) => (
                <div>
                  <p className="font-semibold">{b.domain}</p>
                  <p className="max-w-72 truncate text-xs text-muted-foreground">{b.source}</p>
                </div>
              ),
            },
            { label: "Autorité", sort: (b) => b.authority, render: (b) => nf(b.authority) },
            {
              label: "Statut",
              render: (b) => (
                <Badge
                  variant={
                    b.status === "Actif" ? "success" : b.status === "Perdu" ? "danger" : "muted"
                  }
                >
                  {b.status}
                </Badge>
              ),
            },
            { label: "Date", sort: (b) => b.date, render: (b) => fdate(b.date) },
            {
              label: "Suivi",
              render: (b) => (
                <div className="flex gap-2">
                  <BacklinkEditor item={b} />
                  <NewActionDialog
                    defaults={{
                      title: `Travailler le lien ${b.domain}`,
                      category: "SEO",
                      target: b.source,
                      proofUrl: b.source,
                    }}
                    trigger={
                      <Button size="sm" variant="outline">
                        Créer une action
                      </Button>
                    }
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Concurrents"
        description="Consignez vos observations concurrentielles. Les chiffres non renseignés restent inconnus."
        actions={<CompetitorEditor />}
      />
      <DataTable
        rows={competitors}
        search={(c) => c.name + " " + c.topTerms.join(" ")}
        label="Rechercher un concurrent"
        columns={[
          {
            label: "Concurrent",
            render: (c) => (
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.site}</p>
              </div>
            ),
          },
          {
            label: "Mots-clés communs",
            sort: (c) => c.commonKeywords,
            render: (c) => nf(c.commonKeywords),
          },
          {
            label: "Visibilité SEO (%)",
            sort: (c) => c.seoVisibility,
            render: (c) => nf(c.seoVisibility, 1),
          },
          {
            label: "Présence GEO (%)",
            sort: (c) => c.geoPresence,
            render: (c) => nf(c.geoPresence, 1),
          },
          { label: "Citations IA", sort: (c) => c.aiCitations, render: (c) => nf(c.aiCitations) },
          {
            label: "Suivi",
            render: (c) => (
              <div className="flex gap-2">
                <CompetitorEditor item={c} />
                <NewActionDialog
                  defaults={{
                    title: `Analyser ${c.name}`,
                    category: "GEO",
                    target: c.site,
                    deliverable: "Analyse et preuves comparables",
                  }}
                  trigger={
                    <Button size="sm" variant="outline">
                      Créer une action
                    </Button>
                  }
                />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
