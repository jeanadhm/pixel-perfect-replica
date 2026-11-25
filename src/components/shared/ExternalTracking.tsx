import { useMemo, useState, type ReactNode } from "react";
import { CircleAlert, Link2, RefreshCw, ShieldCheck } from "lucide-react";
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

function BacklinkSync() {
  const { connections, refresh, siteScope, user } = useDemo();
  const [loading, setLoading] = useState(false);
  const scoped = siteScope === "all" ? "ambs" : siteScope;
  async function synchronize() {
    try {
      setLoading(true);
      const response = await fetch(`/api/backlinks/synchronize/${encodeURIComponent(scoped)}`, {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Synchronisation des backlinks indisponible");
      await refresh();
      toast.success(`${data.imported ?? 0} backlink(s) relevé(s) depuis DataForSEO.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Synchronisation des backlinks indisponible");
    } finally {
      setLoading(false);
    }
  }
  if (!connections.dataForSeoConfigured)
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
        <b>Source backlinks à connecter.</b> Ajoutez <code>DATAFORSEO_LOGIN</code> et
        <code> DATAFORSEO_PASSWORD</code> dans les variables Dokploy. Les boutons manuels restent
        disponibles pour une preuve ponctuelle, mais aucun lien n’est inventé.
      </div>
    );
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
      <p className="text-muted-foreground">
        <b className="text-foreground">DataForSEO relié.</b> Relevé réel à la demande pour le site sélectionné.
      </p>
      <Button size="sm" variant="outline" disabled={loading || user?.role === "viewer"} onClick={() => void synchronize()}>
        <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
        {loading ? "Synchronisation…" : "Synchroniser les backlinks"}
      </Button>
    </div>
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
  const { backlinks, competitors, competitorObservations, refresh, user } = useDemo();
  const [refreshingCompetitors, setRefreshingCompetitors] = useState(false);
  const observationById = useMemo(
    () =>
      new Map(competitorObservations.map((observation) => [observation.competitorId, observation])),
    [competitorObservations],
  );

  async function refreshCompetitors() {
    try {
      setRefreshingCompetitors(true);
      const response = await fetch("/api/competitors/probe-all", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Actualisation des concurrents indisponible");
      await refresh();
      const failures = (data.observations ?? []).filter((item: any) => item.error).length;
      toast.success(
        failures
          ? `Relevé terminé : ${failures} concurrent(s) à vérifier.`
          : `${data.observations?.length ?? 0} concurrent(s) actualisé(s).`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Actualisation des concurrents indisponible");
    } finally {
      setRefreshingCompetitors(false);
    }
  }

  if (kind === "backlinks")
    return (
      <div className="space-y-6">
        <PageHeader
          title="Autorité & Backlinks"
          description="Liens entrants observés, sources vérifiables et opportunités de netlinking par site."
          actions={<BacklinkEditor />}
        />
        <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
          <Link2 className="mt-0.5 size-5 shrink-0 text-primary" />
          <p>
            Les backlinks nécessitent une base de données dédiée : Google ne fournit pas cet inventaire
            via Search Console. Les données DataForSEO sont importées avec leur URL source et leur date de
            relevé ; les métriques d’autorité restent celles du fournisseur, pas une estimation AMBS.
          </p>
        </div>
        <BacklinkSync />
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
        description="Les concurrents enregistrés sont contrôlés automatiquement depuis leur page publique."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={refreshingCompetitors || user?.role === "viewer"}
              onClick={() => void refreshCompetitors()}
            >
              <RefreshCw className={refreshingCompetitors ? "size-4 animate-spin" : "size-4"} />
              {refreshingCompetitors ? "Actualisation…" : "Actualiser les concurrents"}
            </Button>
            <CompetitorEditor />
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Concurrents suivis" value={competitors.length} />
        <Kpi
          label="Relevés publics"
          value={competitorObservations.filter((observation) => !observation.error).length}
          tone="success"
          icon={ShieldCheck}
          sub="Titre, balises et structure"
        />
        <Kpi
          label="À vérifier"
          value={competitors.filter((competitor) => !observationById.has(competitor.id)).length}
          tone="primary"
          sub="En attente du premier passage automatique"
        />
        <Kpi
          label="Erreurs de contrôle"
          value={competitorObservations.filter((observation) => observation.error).length}
          tone="danger"
          icon={CircleAlert}
          sub="Dernier relevé uniquement"
        />
      </div>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
        <b className="text-foreground">Surveillance automatique, toutes les 12 heures :</b> disponibilité HTTPS,
        redirections, titre, meta description, robots, H1, H2, données structurées et volume de
        texte. <b className="text-foreground">Ce qui nécessite une source distincte :</b> positions
        Google, part de voix, volume et visibilité IA. Le hub les laisse donc inconnus plutôt que de
        les estimer.
      </div>
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
            label: "Dernier relevé public",
            render: (c) => {
              const observation = observationById.get(c.id);
              if (!observation)
                return <span className="text-xs text-muted-foreground">Premier passage automatique en attente</span>;
              if (observation.error)
                return (
                  <span className="max-w-52 text-xs text-destructive" title={observation.error}>
                    Échec : {observation.error}
                  </span>
                );
              return (
                <div className="max-w-64">
                  <Badge variant="success">HTTP {observation.status}</Badge>
                  <p
                    className="mt-1 truncate text-xs text-muted-foreground"
                    title={observation.title}
                  >
                    {observation.title || "Titre absent"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(observation.checkedAt))}
                  </p>
                </div>
              );
            },
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
              <div className="flex flex-wrap gap-2">
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
