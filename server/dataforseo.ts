import { createHash } from "node:crypto";
import { config } from "./config";
import { pool, transaction } from "./db";
import { HttpError } from "./security";
import { SITES } from "../src/lib/demo/sites";

const endpoint = "https://api.dataforseo.com/v3/backlinks/backlinks/live";
const labsEndpoint = "https://api.dataforseo.com/v3/dataforseo_labs/google";
const FRANCE_LOCATION = 2250;
const DISCOVERY_LIMIT = Math.min(100, Math.max(5, Number(process.env["DATAFORSEO_COMPETITOR_LIMIT"] ?? 40) || 40));
const DETAIL_LIMIT = Math.min(25, Math.max(1, Number(process.env["DATAFORSEO_COMPETITOR_DETAIL_LIMIT"] ?? 12) || 12));

export function dataForSeoConfigured() {
  return Boolean(config.dataForSeoLogin && config.dataForSeoPassword);
}

function dataForSeoAuth() {
  return Buffer.from(`${config.dataForSeoLogin}:${config.dataForSeoPassword}`).toString("base64");
}

async function labsRequest(path: string, task: Record<string, unknown>) {
  if (!dataForSeoConfigured())
    throw new HttpError(
      503,
      "La découverte concurrentielle nécessite DATAFORSEO_LOGIN et DATAFORSEO_PASSWORD côté Dokploy.",
    );
  const response = await fetch(`${labsEndpoint}/${path}/live`, {
    method: "POST",
    signal: AbortSignal.timeout(45000),
    headers: { Authorization: `Basic ${dataForSeoAuth()}`, "Content-Type": "application/json" },
    body: JSON.stringify([{ location_code: FRANCE_LOCATION, language_code: "fr", ...task }]),
  });
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok || body.status_code !== 20000)
    throw new HttpError(502, `DataForSEO a refusé la découverte : ${body.status_message ?? `HTTP ${response.status}`}`);
  const result = body.tasks?.[0];
  if (!result || result.status_code !== 20000)
    throw new HttpError(502, `DataForSEO n’a pas retourné de données exploitables : ${result?.status_message ?? "réponse vide"}`);
  return result.result?.flatMap((entry: any) => entry.items ?? []) ?? [];
}

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function valueAt(item: any, paths: string[]) {
  for (const path of paths) {
    const value = path.split(".").reduce((current, part) => current?.[part], item);
    if (value !== undefined && value !== null) return value;
  }
  return null;
}

function normalizeDomain(value: unknown) {
  if (typeof value !== "string") return null;
  const domain = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? "";
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain) ? domain : null;
}

function competitorId(siteId: string, domain: string) {
  return `dfs-competitor-${siteId}-${createHash("sha256").update(domain).digest("hex").slice(0, 18)}`;
}

function domainName(domain: string) {
  const firstLabel = domain.replace(/^www\./, "").split(".")[0] ?? "";
  return firstLabel
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function uniqueText(values: unknown[], maximum: number) {
  return [...new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0).map((value) => value.trim()))].slice(0, maximum);
}

/**
 * Finds organic-search competitors for a managed site. No starter list is
 * injected: every record is sourced from the provider response and retains
 * that provenance. Detail requests are deliberately capped to protect credit.
 */
export async function discoverCompetitors(siteId: string) {
  const site = SITES.find((item) => item.id === siteId);
  if (!site) throw new HttpError(404, "Site inconnu.");
  const run = await pool.query(
    "INSERT INTO competitor_discovery_runs(site_id) VALUES($1) RETURNING id",
    [siteId],
  );
  const runId = run.rows[0].id as string;
  try {
    const candidates: Array<Record<string, any>> = await labsRequest("competitors_domain", {
      target: site.host,
      limit: DISCOVERY_LIMIT,
    });
    const ownDomain = normalizeDomain(site.host);
    const domains = candidates
      .map((item) => ({ item, domain: normalizeDomain(valueAt(item, ["domain", "target", "main_domain", "url"])) }))
      .filter((entry): entry is { item: Record<string, any>; domain: string } => Boolean(entry.domain) && entry.domain !== ownDomain)
      .filter((entry, index, entries) => entries.findIndex((candidate) => candidate.domain === entry.domain) === index);
    const observedAt = new Date().toISOString();
    const baseRecords = domains.map(({ item, domain }) => {
      const estimatedTraffic = asNumber(valueAt(item, ["metrics.organic.etv", "organic.etv", "etv", "estimated_traffic"]));
      const averagePosition = asNumber(valueAt(item, ["avg_position", "average_position", "metrics.organic.pos_1"]));
      return {
        id: competitorId(siteId, domain),
        siteId,
        name: domainName(domain),
        site: `https://${domain}/`,
        commonKeywords: asNumber(valueAt(item, ["intersections", "intersections_count", "common_keywords"])),
        seoVisibility: null,
        shareOfVoice: null,
        geoPresence: null,
        aiCitations: null,
        estimatedTraffic,
        averagePosition,
        topTerms: uniqueText(
          [
            ...(Array.isArray(item["top_keywords"]) ? item["top_keywords"].map((keyword: any) => keyword.keyword ?? keyword) : []),
            ...(Array.isArray(item["keywords"]) ? item["keywords"].map((keyword: any) => keyword.keyword ?? keyword) : []),
          ],
          12,
        ),
        subdomains: [] as string[],
        publicPages: [] as { url: string; label: string }[],
        discoverySource: "DataForSEO Labs · concurrents organiques",
        discoveredAt: observedAt,
      };
    });
    await transaction(async (client) => {
      for (const record of baseRecords) {
        await client.query(
          `INSERT INTO records(collection,id,site_id,payload,origin,source_url,observed_at)
           VALUES('competitors',$1,$2,$3,'automatic',$4,now())
           ON CONFLICT(collection,id) DO UPDATE
           SET payload = records.payload || EXCLUDED.payload,
               origin='automatic',source_url=EXCLUDED.source_url,observed_at=now(),updated_at=now()`,
           [record.id, siteId, JSON.stringify(record), record.site],
        );
      }
      await client.query("UPDATE workspace_revision SET revision=revision+1 WHERE id=1");
    });

    let enriched = 0;
    for (const record of baseRecords.slice(0, DETAIL_LIMIT)) {
      try {
        const domain = new URL(record.site).hostname;
        const [subdomainItems, keywordItems] = await Promise.all([
          labsRequest("subdomains", { target: domain, limit: 30 }),
          labsRequest("ranked_keywords", { target: domain, limit: 20 }),
        ]);
        const subdomains = uniqueText(
          subdomainItems.map((item: any) => valueAt(item, ["subdomain", "domain", "target"])),
          30,
        );
        const pages = keywordItems
          .map((item: Record<string, any>) => {
            const url = valueAt(item, ["ranked_serp_element.serp_item.url", "serp_item.url", "url"]);
            const label = valueAt(item, ["keyword_data.keyword", "keyword", "keyword_info.keyword"]);
            return typeof url === "string" && /^https:\/\//.test(url)
              ? { url, label: typeof label === "string" ? label : new URL(url).pathname }
              : null;
          })
          .filter((item: { url: string; label: string } | null): item is { url: string; label: string } => Boolean(item));
        const topTerms = uniqueText(keywordItems.map((item: any) => valueAt(item, ["keyword_data.keyword", "keyword", "keyword_info.keyword"])), 20);
        await pool.query(
          `UPDATE records
           SET payload = payload || $2::jsonb, observed_at=now(), updated_at=now()
           WHERE collection='competitors' AND id=$1`,
          [record.id, JSON.stringify({ subdomains, publicPages: pages, topTerms })],
        );
        enriched++;
      } catch {
        // The core competitor record remains useful if an optional detail call
        // is unavailable for a particular external domain.
      }
    }
    await pool.query(
      "UPDATE competitor_discovery_runs SET finished_at=now(),discovered_count=$2,enriched_count=$3 WHERE id=$1",
      [runId, baseRecords.length, enriched],
    );
    return { siteId, discovered: baseRecords.length, enriched, observedAt };
  } catch (error) {
    await pool.query(
      "UPDATE competitor_discovery_runs SET finished_at=now(),error=$2 WHERE id=$1",
      [runId, error instanceof Error ? error.message : "Découverte interrompue."],
    );
    throw error;
  }
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

  const response = await fetch(endpoint, {
    method: "POST",
    signal: AbortSignal.timeout(30000),
    headers: { Authorization: `Basic ${dataForSeoAuth()}`, "Content-Type": "application/json" },
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
