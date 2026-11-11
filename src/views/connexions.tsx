"use client";
import { useState } from "react";
import { toast } from "sonner";
import { PlugZap, RefreshCw, Upload, Download } from "lucide-react";
import { useDemo } from "@/lib/demo/store";
import { SITES } from "@/lib/demo/sites";
import { api } from "@/lib/api/client";
import { PageHeader, Panel } from "@/components/shared/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
const day = (ago: number) => new Date(Date.now() - ago * 86400000).toISOString().slice(0, 10);
export default function ConnectionsPage() {
  const { connections, refresh, user, saving } = useDemo();
  const [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const [available, setAvailable] = useState<{
    gsc: { siteUrl: string }[];
    ga4: { property: string; displayName: string }[];
    errors: string[];
  } | null>(null);
  const [startDate, setStartDate] = useState(day(30)),
    [endDate, setEndDate] = useState(day(3));
  const [csv, setCsv] = useState(""),
    [siteId, setSite] = useState("ambs"),
    [system, setSystem] = useState("");
  async function run(name: string, work: () => Promise<void>) {
    setBusy(name);
    setError("");
    try {
      await work();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Opération impossible";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Connexions & provenance"
        description="Activez les sources réelles, choisissez les propriétés et consultez chaque synchronisation."
      />
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <Panel
        title="1 · Autoriser Google en lecture seule"
        description="Search Console pour la recherche ; GA4 pour les visites et événements clés"
        action={
          <Badge variant={connections.googleConnected ? "success" : "warning"}>
            {connections.googleConnected ? "Compte autorisé" : "Non connecté"}
          </Badge>
        }
      >
        <p className="text-sm leading-6 text-muted-foreground">
          Les jetons restent chiffrés sur le serveur. Cette autorisation ne modifie ni vos sites ni
          vos propriétés Google.
        </p>
        {!connections.googleConfigured && (
          <div className="mt-4 rounded-lg bg-warning/10 p-4 text-sm leading-6">
            Configuration serveur nécessaire : créer un client OAuth dans votre projet Google,
            activer Search Console API, Analytics Data API et Analytics Admin API, puis renseigner
            les variables GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET et GOOGLE_REDIRECT_URI dans
            l’environnement du serveur. Aucun secret ne doit être saisi dans le frontend.
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            disabled={!!busy || !connections.googleConfigured || user?.role !== "admin"}
            onClick={() =>
              void run("google", async () => {
                const result = await api<{ url: string }>("/google/start");
                window.location.assign(result.url);
              })
            }
          >
            <PlugZap className="size-4" />
            {connections.googleConnected ? "Renouveler l’autorisation" : "Connecter Google"}
          </Button>
          <Button
            variant="outline"
            disabled={!!busy || !connections.googleConnected || user?.role !== "admin"}
            onClick={() =>
              void run("properties", async () => setAvailable(await api("/google/properties")))
            }
          >
            Lister les propriétés accessibles
          </Button>
        </div>
        {available?.errors.map((e) => (
          <p key={e} className="mt-3 text-sm text-destructive">
            {e}
          </p>
        ))}
      </Panel>
      <Panel
        title="2 · Relier chaque site à ses propriétés"
        description="Les statistiques sont filtrées sur le domaine exact pour éviter le double comptage des sous-domaines."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {SITES.map((site) => {
            const c = connections.sites.find((c) => c.site_id === site.id);
            return (
              <form
                key={`${site.id}-${c?.gsc_property}-${c?.ga4_property}`}
                className="rounded-xl border p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  void run("save-" + site.id, async () => {
                    await api("/integrations/" + site.id, {
                      method: "PUT",
                      body: JSON.stringify({
                        gscProperty: String(data.get("gsc") ?? "").trim() || null,
                        ga4Property: String(data.get("ga4") ?? "").trim() || null,
                      }),
                    });
                    await refresh();
                    toast.success("Propriétés enregistrées");
                  });
                }}
              >
                <h3 className="font-semibold">{site.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{site.host}</p>
                <label className="mt-4 block text-sm">
                  Propriété Search Console
                  <Input
                    name="gsc"
                    defaultValue={c?.gsc_property ?? ""}
                    list="gsc-properties"
                    placeholder={`sc-domain:${site.host}`}
                    className="mt-1"
                    disabled={user?.role !== "admin"}
                  />
                </label>
                <label className="mt-3 block text-sm">
                  Identifiant de propriété GA4
                  <Input
                    name="ga4"
                    defaultValue={c?.ga4_property ?? ""}
                    list="ga4-properties"
                    placeholder="Identifiant numérique, pas G-…"
                    pattern="[0-9]*"
                    className="mt-1"
                    disabled={user?.role !== "admin"}
                  />
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4"
                  disabled={!!busy || user?.role !== "admin"}
                >
                  Enregistrer
                </Button>
              </form>
            );
          })}
        </div>
        <datalist id="gsc-properties">
          {available?.gsc.map((p) => (
            <option key={p.siteUrl} value={p.siteUrl} />
          ))}
        </datalist>
        <datalist id="ga4-properties">
          {available?.ga4.map((p) => (
            <option key={p.property} value={p.property.replace("properties/", "")}>
              {p.displayName}
            </option>
          ))}
        </datalist>
      </Panel>
      <Panel
        title="3 · Synchroniser une période"
        description="Import à la demande. Aucun indicateur n’est inventé avant la première synchronisation."
      >
        <div className="mb-5 flex flex-wrap gap-4">
          <label className="text-sm">
            Du
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="text-sm">
            Au
            <Input
              type="date"
              max={day(1)}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1"
            />
          </label>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Jusqu’à 93 jours par import. La fin par défaut laisse trois jours pour les données finales
          Google. Les détails des requêtes peuvent être limités ou anonymisés par Google.
        </p>
        <div className="space-y-3">
          {SITES.map((site) => {
            const c = connections.sites.find((c) => c.site_id === site.id);
            return (
              <div
                key={site.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <span className="text-sm font-medium">{site.name}</span>
                <div className="flex flex-wrap gap-2">
                  {(["gsc", "ga4"] as const).map((provider) => (
                    <Button
                      key={provider}
                      size="sm"
                      variant="outline"
                      disabled={
                        !!busy ||
                        saving ||
                        !connections.googleConnected ||
                        !c?.[provider === "gsc" ? "gsc_property" : "ga4_property"] ||
                        user?.role === "viewer"
                      }
                      onClick={() =>
                        void run(provider + "-" + site.id, async () => {
                          const result = await api<{ count: number; message: string }>(
                            `/sync/${provider}/${site.id}`,
                            { method: "POST", body: JSON.stringify({ startDate, endDate }) },
                          );
                          await refresh();
                          toast.success(`${result.count} lignes importées`, {
                            description: result.message,
                          });
                        })
                      }
                    >
                      <RefreshCw
                        className={`size-3.5 ${busy === provider + "-" + site.id ? "animate-spin" : ""}`}
                      />
                      {provider === "gsc" ? "Search Console" : "GA4"}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel
        title="4 · Importer les vrais leads"
        description="En attendant l’API de votre CRM, un export documenté permet de travailler sur de vraies fiches."
      >
        <p className="text-sm leading-6 text-muted-foreground">
          Chaque ligne doit contenir l’identifiant du lead dans la source et son URL de preuve. Une
          ligne déjà importée avec le même identifiant, la même source et le même site est mise à
          jour. L’attribution GEO demande une justification ; une visite IA n’est pas transformée
          automatiquement en lead.
        </p>
        <Button
          variant="outline"
          className="my-4"
          onClick={() => {
            const blob = new Blob(
              ["externalId,company,date,source,channel,url,value,status,attributionEvidence\n"],
              { type: "text/csv;charset=utf-8" },
            );
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "modele-leads.csv";
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          }}
        >
          <Download className="size-4" />
          Modèle CSV vide
        </Button>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run("leads", async () => {
              const result = await api<{ count: number }>("/import/leads", {
                method: "POST",
                body: JSON.stringify({ siteId, system, csv }),
              });
              await refresh();
              setCsv("");
              toast.success(`${result.count} fiches de leads importées`);
            });
          }}
        >
          <label className="text-sm">
            Site
            <select
              className="mt-1 h-10 w-full rounded-md border bg-card px-3"
              value={siteId}
              onChange={(e) => setSite(e.target.value)}
            >
              {SITES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Source du fichier
            <Input
              required
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              placeholder="Nom du CRM ou de l’export interne"
              className="mt-1"
            />
          </label>
          <label className="text-sm">
            Fichier CSV
            <Input
              type="file"
              accept=".csv,text/csv"
              className="mt-1"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 5000000) {
                    setError("Fichier limité à 5 Mo");
                    return;
                  }
                  setCsv(await file.text());
                }
              }}
            />
          </label>
          <div className="flex items-end">
            <Button disabled={!!busy || !csv || saving || user?.role === "viewer"}>
              <Upload className="size-4" />
              Importer les fiches
            </Button>
          </div>
        </form>
      </Panel>
      <Panel title="Historique des synchronisations">
        <div className="space-y-3">
          {!connections.runs.length && (
            <p className="text-sm text-muted-foreground">Aucune synchronisation exécutée.</p>
          )}
          {connections.runs.map((r) => (
            <div key={r.id} className="border-b pb-3 text-sm last:border-0">
              <div className="flex flex-wrap gap-2">
                <b>
                  {r.site_id} · {r.provider.toUpperCase()}
                </b>
                <Badge
                  variant={
                    r.status === "success" ? "success" : r.status === "error" ? "danger" : "warning"
                  }
                >
                  {r.status === "success" ? "Réussie" : r.status === "error" ? "Échec" : "En cours"}
                </Badge>
                <span className="text-muted-foreground">
                  {r.start_date?.slice(0, 10)} → {r.end_date?.slice(0, 10)} · {r.row_count} lignes
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{r.message}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
