import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { pageHead } from "@/lib/head";
import { useDemo } from "@/lib/demo/store";
import { TODAY, OWNERS } from "@/lib/demo/seed";
import { fdate } from "@/lib/demo/utils";
import { PageHeader, Kpi } from "@/components/shared/ui";
import { DataTable } from "@/components/shared/DataTable";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { ActBadge, PriBadge } from "@/components/shared/badges";
import { NewActionDialog, ACTION_STATUSES } from "@/components/actions/NewActionDialog";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/actions")({
  head: pageHead("Actions & Tâches", "Pilotez le plan d’actions SEO et GEO."),
  component: ActionsPage,
});
function ActionsPage() {
  const { actions, workspace } = useDemo();
  const [category, setCategory] = useState("all"),
    [status, setStatus] = useState("all");
  const [owner, setOwner] = useState("all");
  const overdue = (due: string, state: string) =>
    state !== "Terminé" &&
    due < (workspace === "demo" ? TODAY : new Date()).toISOString().slice(0, 10);
  return (
    <>
      <PageHeader
        title="Actions & Tâches"
        description="Un plan d’action partagé pour transformer vos opportunités en résultats."
        actions={<NewActionDialog />}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Actions au total" value={actions.length} />
        <Kpi label="En cours" value={actions.filter((a) => a.status === "En cours").length} />
        <Kpi
          label="Terminées"
          value={actions.filter((a) => a.status === "Terminé").length}
          tone="success"
        />
        <Kpi
          label="En retard"
          value={actions.filter((a) => overdue(a.due, a.status)).length}
          tone="danger"
          sub={
            workspace === "demo"
              ? "Au 10 novembre 2026, date de la démo."
              : "Par rapport à la date du jour."
          }
        />
      </div>
      <DataTable
        rows={actions.filter(
          (a) =>
            (category === "all" || a.category === category) &&
            (status === "all" || a.status === status) &&
            (owner === "all" || a.owner === owner),
        )}
        search={(a) => `${a.title} ${a.target} ${a.owner}`}
        label="Rechercher une action"
        filters={
          <>
            <FilterSelect
              label="Responsable"
              value={owner}
              onChange={setOwner}
              options={[...new Set(actions.map((a) => a.owner))]}
            />
            <FilterSelect
              label="Catégorie"
              value={category}
              onChange={setCategory}
              options={["SEO", "GEO"]}
            />
            <FilterSelect
              label="Statut"
              value={status}
              onChange={setStatus}
              options={ACTION_STATUSES}
            />
          </>
        }
        columns={[
          {
            label: "Action",
            sort: (a) => a.title,
            render: (a) => (
              <div className="min-w-56">
                <NewActionDialog
                  action={a}
                  trigger={
                    <button className="text-left font-semibold hover:text-primary">
                      {a.title}
                    </button>
                  }
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.category} · {a.recurrence ?? "Ponctuelle"} · {a.target}
                </p>
              </div>
            ),
          },
          {
            label: "Priorité",
            sort: (a) => a.priority,
            render: (a) => <PriBadge s={a.priority} />,
          },
          { label: "Responsable", sort: (a) => a.owner, render: (a) => a.owner },
          {
            label: "Échéance",
            sort: (a) => a.due,
            render: (a) => (
              <span className={overdue(a.due, a.status) ? "text-destructive" : ""}>
                {fdate(a.due)}
              </span>
            ),
          },
          { label: "Statut", render: (a) => <ActBadge s={a.status} /> },
          {
            label: "Mesure d’impact",
            render: (a) => (
              <div className="min-w-40 text-xs">
                <p>{a.kpi || "Indicateur à définir"}</p>
                <p className="mt-1 text-muted-foreground">
                  Départ {a.baseline ?? "—"} · Objectif {a.goal ?? "—"}
                </p>
                <p className="mt-1 font-medium">
                  Résultat {a.result ?? "Non mesuré"} {a.metricUnit}
                </p>
              </div>
            ),
          },
          {
            label: "Détails",
            render: (a) => (
              <NewActionDialog
                action={a}
                trigger={
                  <Button size="sm" variant="outline">
                    Modifier
                  </Button>
                }
              />
            ),
          },
        ]}
      />
    </>
  );
}
