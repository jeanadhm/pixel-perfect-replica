import { Globe2, Layers3 } from "lucide-react";
import { useDemo } from "@/lib/demo/store";
import { SITES, type SiteScope } from "@/lib/demo/sites";

export function WorkspaceBar() {
  const { siteScope, setSiteScope, workspace, switchWorkspace } = useDemo();
  return (
    <section aria-label="Périmètre de travail" className="border-b bg-card px-4 py-3 md:px-8">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Layers3 className="size-4" /> Écosystème AMBS
          </span>
          <label className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
            <Globe2 className="size-4 text-primary" />
            <span className="sr-only">Site analysé</span>
            <select
              aria-label="Site analysé"
              className="max-w-[220px] bg-transparent text-sm font-semibold outline-none"
              value={siteScope}
              onChange={(e) => setSiteScope(e.target.value as SiteScope)}
            >
              <option value="all">Tous les sites</option>
              {SITES.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="hidden text-muted-foreground lg:block">
            Sauvegarde navigateur · aucune base de données
          </span>
          <button
            className="rounded-full border px-3 py-1.5 font-medium hover:bg-muted"
            onClick={() => switchWorkspace(workspace === "demo" ? "ambs" : "demo")}
          >
            {workspace === "demo" ? "Mode démo enrichie" : "Mode suivi manuel"} · Changer
          </button>
        </div>
      </div>
      {workspace === "demo" && (
        <p className="mx-auto mt-2 max-w-[1440px] text-xs text-muted-foreground">
          Liens et observations publiques réels · Trafic, positions, conversions, audits et réponses
          IA simulés.
        </p>
      )}
    </section>
  );
}
