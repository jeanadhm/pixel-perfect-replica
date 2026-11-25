"use client";
import { useEffect, useMemo, useState } from "react";
import { MousePointerClick, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { PERIOD_DAYS, useDemo, uid } from "@/lib/demo/store";
import { api } from "@/lib/api/client";
import { Link } from "@/components/navigation";
import type { Lead } from "@/lib/demo/types";
import { siteLabel } from "@/lib/demo/sites";
import { PageHeader, Kpi, Field } from "@/components/shared/ui";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { eur } from "@/lib/demo/utils";
const statuses = ["Nouveau", "Qualifié", "Rendez-vous", "Proposition", "Client", "Perdu"] as const;
export default function LeadsPage() {
  const { leads, update, members, user, siteScope, period, connections } = useDemo();
  const [selected, setSelected] = useState<string | null>(null);
  const [interactions, setInteractions] = useState<SiteEventSummary | null>(null);
  const [loadingInteractions, setLoadingInteractions] = useState(false);
  const lead = leads.find((l) => l.id === selected);
  const selectedSiteHasEventSource = siteScope === "all"
    ? Boolean(connections.siteEventExportsConfigured)
    : connections.siteEventExportSiteIds?.includes(siteScope) ?? false;
  const loadInteractions = async () => {
    setLoadingInteractions(true);
    try {
      setInteractions(await api<SiteEventSummary>(`/site-events?site=${siteScope}&days=${Math.min(93, PERIOD_DAYS[period])}`));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Interactions indisponibles");
      setInteractions(null);
    } finally {
      setLoadingInteractions(false);
    }
  };
  useEffect(() => { void loadInteractions(); }, [siteScope, period]);
  const interactionTotals = useMemo(() => {
    const items = interactions?.items ?? [];
    return {
      total: items.reduce((sum, item) => sum + item.events, 0),
      ctas: items.filter((item) => item.name === "demo_cta_click").reduce((sum, item) => sum + item.events, 0),
      forms: items.filter((item) => item.name === "demo_form_submit").reduce((sum, item) => sum + item.events, 0),
    };
  }, [interactions]);
  const syncInteractions = async () => {
    if (siteScope === "all") {
      toast.message("Sélectionnez un site pour lancer un relevé immédiat.");
      return;
    }
    setLoadingInteractions(true);
    try {
      const data = await api<{ rows: number }>(`/site-events/sync/${siteScope}`, { method: "POST" });
      toast.success(`${data.rows} ligne(s) d’interactions actualisée(s).`);
      await loadInteractions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Synchronisation indisponible");
    } finally {
      setLoadingInteractions(false);
    }
  };
  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads & conversions documentés"
        description="Chaque fiche doit correspondre à un contact commercial réel, avec son origine et sa preuve. Les visites GA4 ne sont pas converties automatiquement en leads."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/connexions">Importer un export CRM</Link>
            </Button>
            <NewLead />
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Fiches disponibles" value={leads.length} sub="Ce ne sont pas des estimations" />
        <Kpi label="Attribution SEO" value={leads.filter((l) => l.source === "SEO").length} />
        <Kpi
          label="Attribution GEO"
          value={leads.filter((l) => l.source === "GEO").length}
          sub="Justification obligatoire"
        />
        <Kpi label="Clients déclarés" value={leads.filter((l) => l.status === "Client").length} />
      </div>
      <section className="rounded-xl border bg-card p-5" aria-labelledby="interactions-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <MousePointerClick className="size-5 text-primary" aria-hidden="true" />
              <h2 id="interactions-title" className="text-lg font-semibold">Interactions & conversions</h2>
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Les événements sont agrégés par bouton et par page. Les coordonnées des visiteurs ne sont jamais envoyées au Hub ; l’admin AMBS relie le parcours au contact après l’envoi du formulaire.
            </p>
          </div>
          <Button variant="outline" disabled={loadingInteractions || user?.role === "viewer" || !selectedSiteHasEventSource || siteScope === "all"} onClick={() => void syncInteractions()}>
            <RefreshCw className={loadingInteractions ? "size-4 animate-spin" : "size-4"} />
            {loadingInteractions ? "Actualisation…" : "Actualiser maintenant"}
          </Button>
        </div>
        {!selectedSiteHasEventSource ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <b>Flux d’interactions à connecter.</b> Ajoutez <code>SITE_EVENT_EXPORTS</code> dans Dokploy avec le jeton du site. Le Hub actualisera ensuite les résultats toutes les 15 minutes.
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi label="Interactions mesurées" value={interactionTotals.total} sub="Clics et envois, pas des leads inventés" />
              <Kpi label="Clics vers une démo" value={interactionTotals.ctas} icon={MousePointerClick} />
              <Kpi label="Formulaires envoyés" value={interactionTotals.forms} tone="success" icon={Send} />
              <Kpi label="Conversion CTA → formulaire" value={interactionTotals.ctas ? `${((interactionTotals.forms / interactionTotals.ctas) * 100).toFixed(1)}%` : "—"} sub="Indicateur de parcours" />
            </div>
            {!loadingInteractions && !(interactions?.items.length) ? (
              <p className="mt-5 rounded-lg bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">Aucune interaction sur cette période. Le suivi commencera dès que les visiteurs cliqueront après l’activation du flux.</p>
            ) : (
              <div className="mt-5 overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-muted/50 text-left text-muted-foreground">
                    <tr><th className="px-4 py-3 font-medium">Ce qui attire</th><th className="px-4 py-3 font-medium">Page</th><th className="px-4 py-3 text-right font-medium">Interactions</th><th className="px-4 py-3 text-right font-medium">Visiteurs uniques</th></tr>
                  </thead>
                  <tbody>
                    {(interactions?.items ?? []).slice(0, 15).map((item) => (
                      <tr key={`${item.name}-${item.path}-${item.label}-${item.destination}`} className="border-t">
                        <td className="px-4 py-3"><p className="font-medium">{item.label || item.destination || "Interaction sans libellé"}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.name === "demo_form_submit" ? "Formulaire envoyé" : item.name === "demo_cta_click" ? "CTA démo" : "Clic"}</p></td>
                        <td className="max-w-64 truncate px-4 py-3 text-muted-foreground" title={item.path}>{item.path}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{item.events}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{item.uniqueVisitors}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
      {!leads.length && (
        <div className="rounded-xl border bg-card p-6 text-sm leading-6 text-muted-foreground">
          Aucune fiche importée ou saisie pour ce périmètre. Cela ne signifie pas que l’entreprise
          n’a aucun lead ; la source commerciale reste à identifier et à alimenter.
        </div>
      )}
      <DataTable
        rows={leads}
        search={(l) => `${l.company} ${l.sourceSystem} ${l.sourceRecordId}`}
        label="Rechercher un lead ou son identifiant"
        columns={[
          {
            label: "Entreprise",
            render: (l) => (
              <button
                className="text-left font-semibold text-primary"
                onClick={() => setSelected(l.id)}
              >
                {l.company}
              </button>
            ),
          },
          { label: "Site", render: (l) => siteLabel(l.siteId ?? "ambs") },
          {
            label: "Source",
            render: (l) => (
              <div>
                {l.source}
                <p className="text-xs text-muted-foreground">
                  {l.sourceSystem} · {l.sourceRecordId}
                </p>
              </div>
            ),
          },
          { label: "Statut", render: (l) => l.status },
          { label: "Responsable", render: (l) => l.owner },
          {
            label: "Preuve",
            render: (l) => (
              <a
                href={l.evidenceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                Ouvrir la source ↗
              </a>
            ),
          },
        ]}
      />
      <Sheet open={!!lead} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {lead && (
            <>
              <SheetHeader>
                <SheetTitle>{lead.company}</SheetTitle>
                <SheetDescription>Fiche reliée à une source commerciale réelle.</SheetDescription>
              </SheetHeader>
              <div className="my-6 grid gap-5">
                <Field label="Origine">
                  {lead.sourceSystem} · {lead.sourceRecordId}
                </Field>
                <Field label="Canal">
                  {lead.channel} · {lead.source}
                </Field>
                <Field label="Justification de l’attribution">
                  {lead.attributionEvidence || "Non renseignée (hors GEO)"}
                </Field>
                <Field label="Valeur déclarée">{eur(lead.value)}</Field>
                <Field label="Preuve">
                  <a
                    href={lead.evidenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-primary underline"
                  >
                    {lead.evidenceUrl}
                  </a>
                </Field>
                <label className="text-sm">
                  Statut
                  <select
                    disabled={user?.role === "viewer"}
                    className="mt-1 h-10 w-full rounded border bg-card px-3"
                    value={lead.status}
                    onChange={(e) =>
                      void update("leads", (rows) =>
                        rows.map((l) =>
                          l.id === lead.id ? { ...l, status: e.target.value as Lead["status"] } : l,
                        ),
                      )
                    }
                  >
                    {statuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Responsable
                  <select
                    disabled={user?.role === "viewer"}
                    className="mt-1 h-10 w-full rounded border bg-card px-3"
                    value={lead.owner}
                    onChange={(e) =>
                      void update("leads", (rows) =>
                        rows.map((l) => (l.id === lead.id ? { ...l, owner: e.target.value } : l)),
                      )
                    }
                  >
                    {["À attribuer", ...members.map((m) => m.name)].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

interface SiteEventSummary {
  startDate: string;
  endDate: string;
  items: Array<{
    name: string;
    path: string;
    label: string;
    destination: string;
    events: number;
    uniqueVisitors: number;
    lastSeenAt: string;
  }>;
}
function NewLead() {
  const { update, siteScope, user } = useDemo();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={user?.role === "viewer"}>Ajouter une fiche réelle</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Documenter un lead</DialogTitle>
          <DialogDescription>
            Renseignez une origine vérifiable. Aucun contact ni résultat ne sera généré
            automatiquement.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const d = Object.fromEntries(new FormData(e.currentTarget));
            if (d["source"] === "GEO" && !String(d["attributionEvidence"]).trim()) {
              toast.error("Justifiez l’attribution GEO");
              return;
            }
            setBusy(true);
            const lead: Lead = {
              id: uid("lead"),
              siteId: siteScope === "all" ? "ambs" : siteScope,
              company: String(d["company"]),
              date: String(d["date"]),
              source: d["source"] as Lead["source"],
              channel: String(d["channel"]),
              origin: String(d["evidenceUrl"]),
              sourceSystem: String(d["sourceSystem"]),
              sourceRecordId: String(d["sourceRecordId"]),
              evidenceUrl: String(d["evidenceUrl"]),
              attributionEvidence: String(d["attributionEvidence"]),
              status: "Nouveau",
              owner: "À attribuer",
              value: 0,
            };
            const ok = await update("leads", (rows) => [lead, ...rows]);
            setBusy(false);
            if (ok) {
              setOpen(false);
              toast.success("Lead enregistré");
            }
          }}
        >
          {[
            { name: "company", label: "Entreprise *" },
            { name: "sourceSystem", label: "Système ou document d’origine *" },
            { name: "sourceRecordId", label: "Identifiant dans la source *" },
            { name: "evidenceUrl", label: "Lien HTTPS de la fiche ou preuve *", type: "url" },
            { name: "channel", label: "Canal observé *" },
          ].map((f) => (
            <label key={f.name} className="block text-sm">
              {f.label}
              <Input
                name={f.name}
                type={f.type ?? "text"}
                required
                className="mt-1"
                {...(f.type === "url" ? { pattern: "https://.*" } : {})}
              />
            </label>
          ))}
          <label className="block text-sm">
            Date *
            <Input
              type="date"
              name="date"
              required
              max={new Date().toISOString().slice(0, 10)}
              className="mt-1"
            />
          </label>
          <label className="block text-sm">
            Attribution
            <select name="source" className="mt-1 h-10 w-full rounded border bg-card px-3">
              {["Direct", "SEO", "GEO", "Référent"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Justification de l’attribution (obligatoire pour GEO)
            <Input
              name="attributionEvidence"
              className="mt-1"
              placeholder="Référent, UTM ou déclaration du prospect"
            />
          </label>
          <Button disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer la fiche"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
