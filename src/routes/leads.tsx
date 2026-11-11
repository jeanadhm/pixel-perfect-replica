import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { pageHead } from "@/lib/head";
import { useDemo, uid } from "@/lib/demo/store";
import { OWNERS } from "@/lib/demo/seed";
import type { Lead } from "@/lib/demo/types";
import { eur, fdate, pct } from "@/lib/demo/utils";
import { PageHeader, Kpi, Panel } from "@/components/shared/ui";
import { DataTable } from "@/components/shared/DataTable";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { FormField, NativeSelect } from "@/components/shared/FormField";
import { Donut, LegendList } from "@/components/charts/charts";
import { Badge } from "@/components/ui/badge";
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
export const Route = createFileRoute("/leads")({
  head: pageHead("Leads & Conversions", "Suivez les opportunités commerciales de démonstration."),
  component: LeadsPage,
});
const SOURCES = ["SEO", "GEO", "Direct", "Référent"] as const;
const STATUSES = ["Nouveau", "Qualifié", "Rendez-vous", "Proposition", "Client", "Perdu"] as const;
function LeadsPage() {
  const { leads, workspace } = useDemo();
  const [source, setSource] = useState("all"),
    [status, setStatus] = useState("all");
  const clients = leads.filter((l) => l.status === "Client");
  const data = SOURCES.map((name) => ({
    name,
    value: leads.filter((l) => l.source === name).length,
  }));
  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads & Conversions"
        description="Reliez votre visibilité aux opportunités commerciales. Saisies locales, toutes dates confondues."
        actions={<LeadEditor />}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Leads" value={leads.length} />
        <Kpi label="Clients" value={clients.length} tone="success" />
        <Kpi
          label="Taux de conversion"
          value={pct(leads.length ? (clients.length / leads.length) * 100 : 0)}
        />
        <Kpi
          label="Valeur du pipeline ouvert"
          value={eur(
            leads
              .filter((l) => !["Client", "Perdu"].includes(l.status))
              .reduce((s, l) => s + l.value, 0),
          )}
        />
      </div>
      <Panel title="Origine des leads">
        <div className="grid items-center gap-6 sm:grid-cols-2">
          <Donut data={data} height={180} />
          <LegendList data={data} />
        </div>
      </Panel>
      <DataTable
        rows={leads.filter(
          (l) =>
            (source === "all" || l.source === source) && (status === "all" || l.status === status),
        )}
        label="Rechercher un lead"
        search={(l) => `${l.company} ${l.owner} ${l.origin}`}
        filters={
          <>
            <FilterSelect label="Source" value={source} onChange={setSource} options={SOURCES} />
            <FilterSelect label="Statut" value={status} onChange={setStatus} options={STATUSES} />
          </>
        }
        columns={[
          {
            label: "Entreprise",
            sort: (l) => l.company,
            render: (l) => (
              <div className="min-w-40">
                <span className="font-semibold">{l.company}</span>
                <p className="text-xs text-muted-foreground">{l.channel}</p>
              </div>
            ),
          },
          {
            label: "Source",
            render: (l) => <Badge variant={l.source === "GEO" ? "geo" : "muted"}>{l.source}</Badge>,
          },
          {
            label: "Statut",
            render: (l) => (
              <Badge
                variant={
                  l.status === "Client" ? "success" : l.status === "Perdu" ? "danger" : "info"
                }
              >
                {l.status}
              </Badge>
            ),
          },
          { label: "Valeur", sort: (l) => l.value, render: (l) => eur(l.value) },
          { label: "Responsable", render: (l) => l.owner },
          { label: "Date", sort: (l) => l.date, render: (l) => fdate(l.date) },
          { label: "Fiche", render: (l) => <LeadEditor lead={l} /> },
        ]}
      />
    </div>
  );
}
function LeadEditor({ lead }: { lead?: Lead }) {
  const { update, actions, workspace } = useDemo();
  const [open, setOpen] = useState(false);
  const blank = (): Lead =>
    lead ?? {
      id: "",
      company: "",
      source: "SEO",
      channel: "Google organique",
      origin: "",
      date: new Date().toISOString().slice(0, 10),
      status: "Nouveau",
      owner: workspace === "ambs" ? "À attribuer" : (OWNERS[0] ?? "Sarah Benali"),
      value: 0,
    };
  const [draft, setDraft] = useState(blank);
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) setDraft(blank());
        setOpen(v);
      }}
    >
      <DialogTrigger asChild>
        <Button variant={lead ? "outline" : "default"} size={lead ? "sm" : "default"}>
          {lead ? "Modifier" : "Nouveau lead"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? "Modifier le lead" : "Nouveau lead"}</DialogTitle>
          <DialogDescription>
            Informations commerciales enregistrées uniquement dans ce navigateur.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.company.trim()) return;
            const saved = { ...draft, company: draft.company.trim(), id: lead?.id ?? uid("ld") };
            update("leads", (items) =>
              lead ? items.map((l) => (l.id === lead.id ? saved : l)) : [saved, ...items],
            );
            setOpen(false);
            toast.success("Lead enregistré");
          }}
        >
          <FormField label="Entreprise *">
            {(id) => (
              <Input
                id={id}
                required
                value={draft.company}
                onChange={(e) => setDraft({ ...draft, company: e.target.value })}
              />
            )}
          </FormField>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Source">
              {(id) => (
                <NativeSelect
                  id={id}
                  options={SOURCES}
                  value={draft.source}
                  onChange={(e) => {
                    const source = e.target.value as Lead["source"];
                    setDraft({
                      ...draft,
                      source,
                      channel: {
                        SEO: "Google organique",
                        GEO: "Moteur IA",
                        Direct: "Accès direct",
                        Référent: "Site partenaire",
                      }[source],
                    });
                  }}
                />
              )}
            </FormField>
            <FormField label="Statut">
              {(id) => (
                <NativeSelect
                  id={id}
                  options={STATUSES}
                  value={draft.status}
                  onChange={(e) => setDraft({ ...draft, status: e.target.value as Lead["status"] })}
                />
              )}
            </FormField>
            <FormField label="Valeur estimée (€)">
              {(id) => (
                <Input
                  id={id}
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={draft.value}
                  onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })}
                />
              )}
            </FormField>
            <FormField label="Responsable">
              {(id) => (
                <NativeSelect
                  id={id}
                  options={[
                    ...new Set([
                      "À attribuer",
                      draft.owner,
                      ...actions.map((a) => a.owner),
                      ...(workspace === "demo" ? OWNERS : []),
                    ]),
                  ]}
                  value={draft.owner}
                  onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
                />
              )}
            </FormField>
          </div>
          <FormField label="Canal">
            {(id) => (
              <Input
                id={id}
                value={draft.channel}
                onChange={(e) => setDraft({ ...draft, channel: e.target.value })}
              />
            )}
          </FormField>
          <FormField label="Page ou contenu d’origine">
            {(id) => (
              <Input
                id={id}
                value={draft.origin}
                onChange={(e) => setDraft({ ...draft, origin: e.target.value })}
              />
            )}
          </FormField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
