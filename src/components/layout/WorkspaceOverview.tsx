import { Link } from "@tanstack/react-router";
import { useDemo } from "@/lib/demo/store";
import { keywordPlan } from "@/lib/demo/workflow";
import { REFERENCE_NOTE } from "@/lib/demo/reference";
import { fdate, nf } from "@/lib/demo/utils";
import { PageHeader, Kpi, Panel, Empty } from "@/components/shared/ui";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NewActionDialog } from "@/components/actions/NewActionDialog";
export function WorkspaceOverview({ seo = false }: { seo?: boolean }) {
  const { keywords, actions, geoTests, pages, leads } = useDemo();
  const observed = keywords.filter((k) => k.measurements?.length);
  const manualGeo = geoTests.filter((t) => t.origin === "Saisie manuelle");
  const upcoming = [...actions]
    .filter((a) => a.status !== "Terminé")
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 6);
  return (
    <div className="space-y-6">
      <PageHeader
        title={seo ? "SEO Performance" : "Pilotage SEO & GEO AMBS"}
        description={
          seo
            ? "Mesurez les résultats de vos optimisations à partir de vos relevés réels."
            : "Du mot-clé à travailler au résultat mesuré : organisez, exécutez et améliorez votre visibilité."
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/mots-cles">Plan de mots-clés</Link>
            </Button>
            <NewActionDialog />
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Mots-clés à cibler"
          value={keywords.filter((k) => keywordPlan(k).stage === "À cibler").length}
        />
        <Kpi
          label="Mots-clés intégrés"
          value={keywords.filter((k) => keywordPlan(k).stage === "Intégré").length}
          tone="success"
        />
        <Kpi
          label="Expressions mesurées"
          value={`${observed.length}/${keywords.length}`}
          sub="Au moins un relevé manuel."
        />
        <Kpi
          label="Actions terminées"
          value={`${actions.filter((a) => a.status === "Terminé").length}/${actions.length}`}
        />
      </div>
      <Panel title="Référentiel de départ" description="Plan proposé, à valider avec votre équipe">
        <p className="text-sm leading-relaxed text-muted-foreground">{REFERENCE_NOTE}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="info">6 solutions AMBS</Badge>
          <Badge variant="geo">Priorité GEO</Badge>
          <Badge variant="muted">WhatsApp · RCS · Automation · Automobile · Immobilier</Badge>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Les 240 expressions et 30 familles complètes sont annoncées dans un classeur externe au
          PDF. Cet espace reprend uniquement les expressions visibles, avec des champs non mesurés
          laissés vides. Les dates d’action proposées sont modifiables.
        </p>
      </Panel>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title={seo ? "Relevés SEO manuels" : "Prochaines actions"}
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link to={seo ? "/mots-cles" : "/actions"}>Tout voir</Link>
            </Button>
          }
        >
          {seo ? (
            observed.length ? (
              <ul className="space-y-3">
                {observed.slice(0, 6).map((k) => (
                  <li key={k.id} className="flex justify-between gap-3 border-b pb-3 text-sm">
                    <span>{k.term}</span>
                    <span className="text-muted-foreground">
                      Position {k.position ?? "hors top 100"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="Aucune mesure disponible. Ajoutez un relevé depuis la fiche d’un mot-clé." />
            )
          ) : (
            <ul className="space-y-3">
              {upcoming.map((a) => (
                <li key={a.id} className="flex items-start gap-3 border-b pb-3 last:border-0">
                  <Badge variant={a.category === "GEO" ? "geo" : "info"}>{a.category}</Badge>
                  <div className="min-w-0">
                    <NewActionDialog
                      action={a}
                      trigger={
                        <button className="text-left text-sm font-medium hover:text-primary">
                          {a.title}
                        </button>
                      }
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.owner} · {fdate(a.due)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Mesure et connexions">
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="Observations GEO" value={manualGeo.length} tone="geo" />
            <Kpi label="Leads saisis" value={leads.length} />
            <Kpi
              label="Pages à vérifier"
              value={pages.filter((p) => p.published === "À vérifier").length}
            />
            <Kpi
              label="Actions avec résultat"
              value={actions.filter((a) => a.result != null).length}
            />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Search Console, GA4, Bing et le CRM ne sont pas connectés. Aucune statistique de trafic
            ni position n’est inventée ; les observations sont saisies et sauvegardées dans ce
            navigateur.
          </p>
          <Button className="mt-4" variant="outline" asChild>
            <Link to="/parametres">Sauvegardes et paramètres</Link>
          </Button>
        </Panel>
      </div>
      {seo && (
        <DataTable
          rows={observed}
          label="Rechercher un relevé SEO"
          search={(k) => k.term}
          columns={[
            { label: "Expression", render: (k) => k.term },
            { label: "Dernier relevé", render: (k) => fdate(k.lastCheck) },
            { label: "Position", sort: (k) => k.position, render: (k) => nf(k.position, 1) },
            { label: "Clics du relevé", render: (k) => nf(k.measurements?.at(-1)?.clicks ?? null) },
            { label: "Périmètre", render: (k) => k.measurements?.at(-1)?.notes || "À documenter" },
          ]}
        />
      )}
    </div>
  );
}
