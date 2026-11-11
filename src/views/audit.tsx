"use client";
import { useState } from "react";
import { toast } from "sonner";
import { pageHead } from "@/lib/head";
import { uid, useDemo } from "@/lib/demo/store";
import { AUDIT_CHECKS, AUDIT_STATUSES } from "@/lib/demo/audit";
import { PageHeader, Kpi } from "@/components/shared/ui";
import { NativeSelect, FormField } from "@/components/shared/FormField";
import { NewActionDialog } from "@/components/actions/NewActionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

function AuditPage() {
  const { pages, audits } = useDemo();
  const [pageId, setPageId] = useState(pages[0]?.id ?? "");
  const page = pages.find((p) => p.id === pageId) ?? pages[0];
  const [filter, setFilter] = useState("Tous les contrôles");
  const records = audits.filter((a) => a.pageId === page?.id);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit des pages · SEO & GEO"
        description="24 contrôles opérationnels dérivés du référentiel fourni. La conformité est saisie par l’équipe, aucun scan automatique n’est exécuté."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Contrôles par page" value={AUDIT_CHECKS.length} />
        <Kpi
          label="Conformes"
          value={records.filter((r) => r.status === "Conforme").length}
          tone="success"
        />
        <Kpi
          label="À corriger"
          value={records.filter((r) => r.status === "À corriger").length}
          tone="danger"
        />
        <Kpi
          label="À vérifier"
          value={AUDIT_CHECKS.length - records.filter((r) => r.status !== "À vérifier").length}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="w-full sm:w-96">
          <FormField label="Page auditée">
            {(id) => (
              <select
                id={id}
                value={page?.id ?? ""}
                className="h-10 w-full rounded-md border bg-card px-3 text-sm"
                onChange={(e) => setPageId(e.target.value)}
              >
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </FormField>
        </div>
        <div className="w-52">
          <FormField label="Filtrer les contrôles">
            {(id) => (
              <NativeSelect
                id={id}
                options={["Tous les contrôles", "SEO", "GEO"]}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            )}
          </FormField>
        </div>
      </div>
      {page && (
        <div className="grid gap-3 lg:grid-cols-2">
          {AUDIT_CHECKS.filter((c) => filter === "Tous les contrôles" || c[1] === filter).map(
            (check) => (
              <AuditItem
                key={`${page.id}-${check[0]}`}
                pageId={page.id}
                pageName={page.name}
                check={check}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
function AuditItem({
  pageId,
  pageName,
  check,
}: {
  pageId: string;
  pageName: string;
  check: (typeof AUDIT_CHECKS)[number];
}) {
  const { audits, update } = useDemo();
  const saved = audits.find((a) => a.pageId === pageId && a.checkId === check[0]);
  const [draft, setDraft] = useState({
    status: saved?.status ?? "À vérifier",
    notes: saved?.notes ?? "",
    evidenceUrl: saved?.evidenceUrl ?? "",
  });
  return (
    <form
      className="card-surface space-y-3 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const record = {
          ...draft,
          id: saved?.id ?? uid("audit"),
          pageId,
          checkId: check[0],
          checkedAt: new Date().toISOString(),
        };
        if (
          !(await update("audits", (items) => [
            ...items.filter((a) => !(a.pageId === pageId && a.checkId === check[0])),
            record,
          ]))
        )
          return;
        toast.success("Contrôle enregistré");
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold">{check[2]}</h2>
        <Badge variant={check[1] === "GEO" ? "geo" : "info"}>{check[1]}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">{check[3]}</p>
      <FormField label={`Statut · ${check[2]}`}>
        {(id) => (
          <NativeSelect
            id={id}
            options={AUDIT_STATUSES}
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value as typeof draft.status })}
          />
        )}
      </FormField>
      <FormField label="Observation">
        {(id) => (
          <Input
            id={id}
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
        )}
      </FormField>
      <FormField label="Preuve ou rapport">
        {(id) => (
          <Input
            id={id}
            type="url"
            pattern="https?://.*"
            value={draft.evidenceUrl}
            onChange={(e) => setDraft({ ...draft, evidenceUrl: e.target.value })}
          />
        )}
      </FormField>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" type="submit" variant="outline">
          Enregistrer le contrôle
        </Button>
        <NewActionDialog
          defaults={{
            title: `${check[2]} — ${pageName}`,
            category: check[1],
            pageId,
            target: pageName,
            deliverable: "Contrôle conforme avec preuve",
            priority: "Haute",
          }}
          trigger={
            <Button size="sm" type="button">
              Créer une correction
            </Button>
          }
        />
      </div>
    </form>
  );
}

export default AuditPage;
