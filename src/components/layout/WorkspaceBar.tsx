"use client";
import { Globe2, Database, PlugZap } from "lucide-react";
import { useDemo } from "@/lib/demo/store";
import { SITES, type SiteScope } from "@/lib/demo/sites";
import { Link } from "@/components/navigation";
export function WorkspaceBar() {
  const { siteScope, setSiteScope, saving, error, connections } = useDemo();
  return (
    <section className="border-b bg-card px-4 py-3 md:px-8">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
          <Globe2 className="size-4 text-primary" />
          <span className="sr-only">Site analysé</span>
          <select
            aria-label="Site analysé"
            className="max-w-56 bg-transparent text-sm font-semibold"
            value={siteScope}
            onChange={(e) => setSiteScope(e.target.value as SiteScope)}
          >
            <option value="all">Tous les sites</option>
            {SITES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Database className="size-3.5" />
            {error ? "Enregistrement à vérifier" : saving ? "Enregistrement…" : "Espace partagé"}
          </span>
          <Link to="/connexions" className="flex items-center gap-1.5 font-medium text-primary">
            <PlugZap className="size-3.5" />
            {connections.googleConnected ? "Sources Google connectées" : "Connecter les sources"}
          </Link>
        </div>
      </div>
    </section>
  );
}
