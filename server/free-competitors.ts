import { createHash } from "node:crypto";
import { config } from "./config";
import { pool, transaction } from "./db";
import { HttpError } from "./security";
import { SITES } from "../src/lib/demo/sites";

const MAX_KEYWORDS = Math.min(12, Math.max(1, Number(process.env["FREE_COMPETITOR_KEYWORD_LIMIT"] ?? 5) || 5));
const RESULTS_PER_KEYWORD = Math.min(6, Math.max(1, Number(process.env["FREE_COMPETITOR_RESULTS_PER_KEYWORD"] ?? 3) || 3));
const ignoredDomains = new Set([
  "bing.com",
  "microsoft.com",
  "google.com",
  "youtube.com",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "wikipedia.org",
  "larousse.fr",
  "lerobert.com",
  "wiktionary.org",
  "wordreference.com",
  "france-travail.fr",
  "cnrtl.fr",
  "commentcamarche.net",
  "onisep.fr",
  "baidu.com",
  "zhihu.com",
  "duckduckgo.com",
]);

type PublicResult = { url: string; domain: string };

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^www\./, "");
}

function rootDomain(host: string) {
  const labels = normalizeDomain(host).split(".");
  return labels.length > 2 ? labels.slice(-2).join(".") : labels.join(".");
}

function domainName(domain: string) {
  return (domain.split(".")[0] ?? domain)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function candidateId(siteId: string, domain: string) {
  return `public-competitor-${siteId}-${createHash("sha256").update(domain).digest("hex").slice(0, 18)}`;
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&#x2f;/gi, "/")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

/**
 * Extracts organic links from DuckDuckGo's public HTML endpoint. Discovery is
 * intentionally source-based: it does not infer rank, traffic or a competing
 * relationship from an LLM response.
 */
function extractPublicResults(html: string) {
  const results: PublicResult[] = [];
  const matches = html.matchAll(/<a[^>]+class=["'][^"']*\bresult__a\b[^"']*["'][^>]+href=["']([^"']+)["']/gi);
  for (const match of matches) {
    try {
      const href = decodeHtml(match[1] ?? "");
      const redirect = new URL(href, "https://duckduckgo.com");
      const target = redirect.searchParams.get("uddg") ?? href;
      const parsed = new URL(target);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") continue;
      results.push({ url: parsed.href, domain: normalizeDomain(parsed.hostname) });
    } catch {
      // Ignore non-web or malformed public links.
    }
  }
  return results;
}

async function publicDuckDuckGoSearch(keyword: string) {
  const url = new URL("https://html.duckduckgo.com/html/");
  url.searchParams.set("q", keyword);
  url.searchParams.set("kl", "fr-fr");
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "fr-FR,fr;q=0.9",
      "User-Agent": "Mozilla/5.0 (compatible; AMBS-VisibilityHub/1.0; +https://ambs-agency.com)",
    },
  });
  if (!response.ok) throw new HttpError(502, `La recherche publique DuckDuckGo a répondu HTTP ${response.status}.`);
  return extractPublicResults(await response.text())
    .filter((result) => !ignoredDomains.has(rootDomain(result.domain)))
    .slice(0, RESULTS_PER_KEYWORD);
}

async function discoveryTerms(siteId: string) {
  const site = SITES.find((item) => item.id === siteId);
  if (!site) throw new HttpError(404, "Site inconnu.");
  const rows = await pool.query(
    `SELECT payload->>'keyword' AS keyword, payload->>'name' AS name
       FROM records
      WHERE collection='keywords' AND site_id=$1
      ORDER BY COALESCE((payload->>'clicks')::numeric, 0) DESC, updated_at DESC
      LIMIT 30`,
    [siteId],
  );
  const gscTerms = rows.rows
    .map((row) => String(row.keyword ?? row.name ?? "").trim())
    .filter(Boolean);
  // Terms describing the offer are evaluated first. This prevents a handful
  // of generic, high-click GSC queries from masking the actual market.
  return [...new Set([...site.terms, ...gscTerms])].slice(0, MAX_KEYWORDS);
}

export function freeCompetitorDiscoveryConfigured() {
  return config.freeCompetitorDiscoveryEnabled;
}

/**
 * Creates candidates seen in public DuckDuckGo results for genuine site terms.
 * Every row retains its public source and intentionally leaves unknown SEO/GEO
 * metrics null. Existing manually maintained competitor records are preserved.
 */
export async function discoverFreeCompetitors(siteId: string) {
  const site = SITES.find((item) => item.id === siteId);
  if (!site) throw new HttpError(404, "Site inconnu.");
  if (!freeCompetitorDiscoveryConfigured())
    throw new HttpError(503, "La découverte gratuite a été désactivée par la configuration serveur.");

  const terms = await discoveryTerms(siteId);
  if (!terms.length) throw new HttpError(422, "Aucun mot-clé exploitable n’est disponible pour ce site.");

  const managedDomains = new Set(SITES.map((item) => rootDomain(item.host)));
  const candidates = new Map<string, { terms: Set<string>; pages: Map<string, string>; subdomains: Set<string> }>();
  const failures: string[] = [];

  for (const term of terms) {
    try {
      const results = await publicDuckDuckGoSearch(term);
      for (const result of results) {
        const domain = rootDomain(result.domain);
        if (!domain || managedDomains.has(domain) || ignoredDomains.has(domain)) continue;
        const candidate = candidates.get(domain) ?? { terms: new Set<string>(), pages: new Map<string, string>(), subdomains: new Set<string>() };
        candidate.terms.add(term);
        candidate.pages.set(result.url, term);
        if (result.domain !== domain) candidate.subdomains.add(result.domain);
        candidates.set(domain, candidate);
      }
    } catch {
      failures.push(term);
    }
  }

  const observedAt = new Date().toISOString();
  const records = [...candidates.entries()].map(([domain, candidate]) => ({
    id: candidateId(siteId, domain),
    siteId,
    name: domainName(domain),
    site: `https://${domain}/`,
    commonKeywords: candidate.terms.size,
    seoVisibility: null,
    shareOfVoice: null,
    geoPresence: null,
    aiCitations: null,
    estimatedTraffic: null,
    averagePosition: null,
    topTerms: [...candidate.terms].slice(0, MAX_KEYWORDS),
    subdomains: [...candidate.subdomains].slice(0, 20),
    publicPages: [...candidate.pages.entries()].slice(0, 12).map(([url, label]) => ({ url, label })),
    discoverySource: "Résultats publics DuckDuckGo · présence observée",
    discoveredAt: observedAt,
  }));

  await transaction(async (client) => {
    // Remove only the false candidates created by the retired Bing discovery.
    // Manually recorded competitors and results from other sources remain intact.
    await client.query(
      `DELETE FROM records
        WHERE collection='competitors'
          AND site_id=$1
          AND origin='automatic'
          AND (payload->>'discoverySource') = 'Résultats publics Bing · présence observée'`,
      [siteId],
    );
    for (const record of records) {
      await client.query(
        `INSERT INTO records(collection,id,site_id,payload,origin,source_url,observed_at)
         VALUES('competitors',$1,$2,$3,'automatic',$4,now())
         ON CONFLICT(collection,id) DO UPDATE
         SET payload = records.payload || EXCLUDED.payload,
             origin='automatic', source_url=EXCLUDED.source_url, observed_at=now(), updated_at=now()`,
        [record.id, siteId, JSON.stringify(record), "https://html.duckduckgo.com/html/"],
      );
    }
    await client.query("UPDATE workspace_revision SET revision=revision+1 WHERE id=1");
  });

  return {
    siteId,
    discovered: records.length,
    queriedTerms: terms.length,
    failedTerms: failures.length,
    observedAt,
    source: "Résultats publics DuckDuckGo",
  };
}
