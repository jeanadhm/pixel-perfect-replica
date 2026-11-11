"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useDemo, uid } from "@/lib/demo/store";
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
  const { leads, update, members, user } = useDemo();
  const [selected, setSelected] = useState<string | null>(null);
  const lead = leads.find((l) => l.id === selected);
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
