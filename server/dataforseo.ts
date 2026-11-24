import { createHash } from "node:crypto";
import { config } from "./config";
import { pool, transaction } from "./db";
import { HttpError } from "./security";
import { SITES } from "../src/lib/demo/sites";

const endpoint = "https://api.dataforseo.com/v3/backlinks/backlinks/live";

export function dataForSeoConfigured() {
  return Boolean(config.dataForSeoLogin && config.dataForSeoPassword);
}

function backlinkId(source: string, target: string) {
  return `dfs-${createHash("sha256").update(`${source}|${target}`).digest("hex").slice(0, 24)}`;
}

function quality(domainRank: number | null) {
  if (domainRank === null) return "Moyenne";
  if (domainRank >= 70) return "Excellente";
  if (domainRank >= 40) return "Bonne";
  return "Faible";
}

/**
 * Imports links observed by DataForSEO. The endpoint is intentionally called
 * only on an explicit operator action: backlink rows consume account credit.
 */
export async function synchronizeBacklinks(siteId: string) {
  if (!dataForSeoConfigured())
    throw new HttpError(
      503,
      "Le connecteur DataForSEO n’est pas configuré. Ajoutez DATAFORSEO_LOGIN et DATAFORSEO_PASSWORD côté Dokploy.",
    );
  const site = SITES.find((item) => item.id === siteId);
  if (!site) throw new HttpError(404, "Site inconnu.");

  const auth = Buffer.from(`${config.dataForSeoLogin}:${config.dataForSeoPassword}`).toString("base64");
  const response = await fetch(endpoint, {
    method: "POST",
    signal: AbortSignal.timeout(30000),
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      {
        target: site.host,
        include_subdomains: true,
        exclude_internal_backlinks: true,
        backlinks_status_type: "all",
        rank_scale: "one_hundred",
        limit: 250,
        order_by: ["rank,desc"],
      },
    ]),
  });
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok || body.status_code !== 20000) {
    const detail = body.status_message || `HTTP ${response.status}`;
    throw new HttpError(502, `DataForSEO a refusé le relevé : ${detail}`);
  }
  const task = body.tasks?.[0];
  if (!task || task.status_code !== 20000)
    throw new HttpError(502, `DataForSEO n’a pas retourné de relevé exploitable : ${task?.status_message ?? "réponse vide"}`);
  const items = task.result?.flatMap((result: any) => result.items ?? []) ?? [];
  const observedAt = new Date().toISOString();
  await transaction(async (client) => {
    for (const item of items) {
      const source = item.url_from ?? item.url ?? item.url_to;
      const target = item.url_to ?? `${site.url}/`;
      if (typeof source !== "string" || typeof target !== "string") continue;
      const rank = Number.isFinite(Number(item.rank)) ? Number(item.rank) : null;
      const attributes: string[] = Array.isArray(item.attributes) ? item.attributes : [];
      const type = attributes.includes("nofollow") || item.dofollow === false
        ? "Nofollow"
        : attributes.includes("sponsored")
          ? "Sponsorisé"
          : attributes.includes("ugc")
            ? "UGC"
            : "Dofollow";
      const record = {
        id: backlinkId(source, target),
        siteId,
        source,
        domain: item.domain_from ?? new URL(source).hostname,
        target,
        authority: rank,
        date: String(item.first_seen ?? item.last_seen ?? observedAt).slice(0, 10),
        type,
        status: item.is_lost ? "Perdu" : "Actif",
        quality: quality(rank),
      };
      await client.query(
        `INSERT INTO records(collection,id,site_id,payload,origin,source_url,observed_at)
         VALUES('backlinks',$1,$2,$3,'automatic',$4,now())
         ON CONFLICT(collection,id) DO UPDATE SET payload=EXCLUDED.payload,source_url=EXCLUDED.source_url,observed_at=now(),updated_at=now()`,
        [record.id, siteId, JSON.stringify(record), source],
      );
    }
    await client.query("UPDATE workspace_revision SET revision=revision+1 WHERE id=1");
  });
  return { siteId, imported: items.length, observedAt };
}
