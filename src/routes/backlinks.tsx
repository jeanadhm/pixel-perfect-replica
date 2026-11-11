import { ExternalTracking } from "@/components/shared/ExternalTracking";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useDemo } from "@/lib/demo/store";
import { Empty, Panel } from "@/components/shared/ui";
import { pageHead } from "@/lib/head";
import { seedBacklinks, seedMentions } from "@/lib/demo/seed";
import { fdate, nf } from "@/lib/demo/utils";
import { PageHeader, Kpi } from "@/components/shared/ui";
import { DataTable } from "@/components/shared/DataTable";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { NewActionDialog } from "@/components/actions/NewActionDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
export const Route = createFileRoute("/backlinks")({
  head: pageHead("Autorité & Backlinks", "Surveillez les liens et mentions de votre marque."),
  component: BacklinksPage,
});
function BacklinksPage() {
  const { workspace } = useDemo();
  const [status, setStatus] = useState("all");
  if (workspace === "ambs") return <ExternalTracking kind="backlinks" />;
  return (
    <>
      <PageHeader
        title="Autorité & Backlinks"
        description="Suivez votre profil de liens et repérez les mentions à valoriser. Les liens et mentions ci-dessous sont fictifs."
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Backlinks" value={seedBacklinks.length} />
        <Kpi label="Domaines référents" value={new Set(seedBacklinks.map((b) => b.domain)).size} />
        <Kpi
          label="Autorité moyenne"
          value={nf(
            seedBacklinks.reduce((s, b) => s + (b.authority ?? 0), 0) / seedBacklinks.length,
            1,
          )}
        />
        <Kpi
          label="Liens perdus"
          value={seedBacklinks.filter((b) => b.status === "Perdu").length}
          tone="danger"
        />
      </div>
      <Tabs defaultValue="links">
        <TabsList>
          <TabsTrigger value="links">Backlinks</TabsTrigger>
          <TabsTrigger value="mentions">Mentions de marque</TabsTrigger>
        </TabsList>
        <TabsContent value="links" className="mt-4">
          <DataTable
            rows={seedBacklinks.filter((b) => status === "all" || b.status === status)}
            search={(b) => `${b.domain} ${b.target}`}
            label="Rechercher un domaine"
            filters={
              <FilterSelect
                label="Statut"
                value={status}
                onChange={setStatus}
                options={["Actif", "Perdu", "En attente"]}
              />
            }
            columns={[
              {
                label: "Domaine source",
                sort: (b) => b.domain,
                render: (b) => (
                  <div>
                    <span className="font-semibold">{b.domain}</span>
                    <span
                      className="mt-1 block max-w-72 truncate text-xs text-muted-foreground"
                      title={b.source}
                    >
                      {b.source}
                    </span>
                  </div>
                ),
              },
              { label: "Type", render: (b) => b.type },
              { label: "Autorité", sort: (b) => b.authority, render: (b) => `${b.authority}/100` },
              { label: "Qualité", render: (b) => b.quality },
              {
                label: "Statut",
                render: (b) => (
                  <Badge
                    variant={
                      b.status === "Actif" ? "success" : b.status === "Perdu" ? "danger" : "warning"
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
                  <NewActionDialog
                    defaults={{
                      title: `${b.status === "Perdu" ? "Récupérer" : "Suivre"} le lien ${b.domain}`,
                      target: b.source,
                      category: "SEO",
                      deliverable: "Lien vérifié",
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
        </TabsContent>
        <TabsContent value="mentions" className="mt-4">
          <DataTable
            rows={seedMentions}
            search={(m) => m.site}
            label="Rechercher une mention"
            columns={[
              { label: "Site", render: (m) => <span className="font-semibold">{m.site}</span> },
              { label: "Format", render: (m) => m.type },
              { label: "Date", sort: (m) => m.date, render: (m) => fdate(m.date) },
              {
                label: "Lien présent",
                render: (m) => (
                  <Badge variant={m.linked ? "success" : "warning"}>
                    {m.linked ? "Oui" : "Non"}
                  </Badge>
                ),
              },
              {
                label: "Opportunité",
                render: (m) => (
                  <NewActionDialog
                    defaults={{
                      title: `Valoriser la mention sur ${m.site}`,
                      target: m.url,
                      category: "GEO",
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
        </TabsContent>
      </Tabs>
    </>
  );
}
