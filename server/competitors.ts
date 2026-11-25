import https from "node:https";
import { lookup } from "node:dns/promises";
import type { IncomingHttpHeaders } from "node:http";
import * as cheerio from "cheerio";
import { pool, transaction } from "./db";
import { HttpError } from "./security";

export type CompetitorObservation = {
  competitorId: string;
  checkedAt: string;
  url: string;
  finalUrl: string | null;
  status: number | null;
  title: string;
  metaDescription: string;
  robots: string;
  h1: string;
  h2Count: number;
  schemaBlocks: number;
  wordCount: number;
  error: string | null;
};

const inFlight = new Map<string, Promise<CompetitorObservation>>();

// Public reference set for AMBS' conversational and automotive offer. These
// are only used to bootstrap an empty workspace; teams can still edit or add
// competitors from the interface afterwards.
const DEFAULT_COMPETITORS = [
  {
    id: "competitor-diago",
    name: "Diago",
    site: "https://www.diago.ai/",
    topTerms: ["IA vocale automobile", "prise de rendez-vous", "concessions"],
  },
  {
    id: "competitor-lineshift",
    name: "Lineshift",
    site: "https://www.lineshift.ai/",
    topTerms: ["agents IA automobile", "voix", "CRM", "workflows"],
  },
  {
    id: "competitor-natalia",
    name: "Natalia",
    site: "https://getnatalia.com/fr/",
    topTerms: ["agent vocal IA", "WhatsApp", "automobile"],
  },
  {
    id: "competitor-ekonsilio",
    name: "eKonsilio",
    site: "https://www.ekonsilio.com/",
    topTerms: ["relation client", "chat", "WhatsApp", "automobile"],
  },
] as const;

export async function ensureDefaultCompetitors() {
  let created = 0;
  await transaction(async (client) => {
    const existing = await client.query(
      "SELECT id,lower(regexp_replace(payload->>'site','/$','')) AS site FROM records WHERE collection='competitors' FOR UPDATE",
    );
    const known = new Set(existing.rows.map((row) => row.site));
    for (const competitor of DEFAULT_COMPETITORS) {
      const normalized = competitor.site.replace(/\/$/, "").toLowerCase();
      if (known.has(normalized)) continue;
      const payload = {
        ...competitor,
        siteId: "ambs",
        commonKeywords: null,
        seoVisibility: null,
        shareOfVoice: null,
        geoPresence: null,
        aiCitations: null,
      };
      await client.query(
        `INSERT INTO records(collection,id,site_id,payload,origin,source_url,observed_at)
         VALUES('competitors',$1,'ambs',$2,'reference',$3,now())
         ON CONFLICT(collection,id) DO NOTHING`,
        [competitor.id, JSON.stringify(payload), competitor.site],
      );
      known.add(normalized);
      created++;
    }
    if (created) await client.query("UPDATE workspace_revision SET revision=revision+1 WHERE id=1");
  });
  return created;
}

function isPublicIp(address: string) {
  const value = address.toLowerCase();
  if (value.includes(":"))
    return !(
      value === "::1" ||
      value.startsWith("fc") ||
      value.startsWith("fd") ||
      value.startsWith("fe80:") ||
      value.startsWith("::ffff:127.")
    );
  const [a = -1, b = -1] = value.split(".").map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

async function resolvePublicUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new HttpError(400, "L’URL du concurrent est invalide.");
  }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443"))
    throw new HttpError(400, "Seules les URL HTTPS publiques sur le port 443 sont acceptées.");
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  const primary = addresses[0];
  if (!primary || addresses.some((item) => !isPublicIp(item.address)))
    throw new HttpError(400, "Cette URL ne pointe pas vers un hôte public autorisé.");
  return { url, address: primary.address };
}

async function requestPage(value: string) {
  let requested = value;
  for (let attempt = 0; attempt < 4; attempt++) {
    const { url, address } = await resolvePublicUrl(requested);
    const result = await new Promise<{
      status: number;
      headers: IncomingHttpHeaders;
      html: string;
    }>((resolve, reject) => {
      const req = https.request(
        {
          hostname: address,
          family: address.includes(":") ? 6 : 4,
          servername: url.hostname,
          method: "GET",
          path: url.pathname + url.search,
          headers: {
            Host: url.host,
            "User-Agent": "AMBS-Visibility-Hub/1.0 (+https://analytics.ambs-agency.com)",
            Accept: "text/html,application/xhtml+xml",
          },
          timeout: 15000,
        },
        (response) => {
          const chunks: Buffer[] = [];
          let size = 0;
          response.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > 1_500_000) {
              req.destroy(new Error("Page concurrente trop volumineuse."));
              return;
            }
            chunks.push(chunk);
          });
          response.on("end", () =>
            resolve({
              status: response.statusCode ?? 0,
              headers: response.headers,
              html: Buffer.concat(chunks).toString("utf8"),
            }),
          );
        },
      );
      req.once("timeout", () =>
        req.destroy(new Error("Le concurrent ne répond pas dans le délai.")),
      );
      req.once("error", reject);
      req.end();
    });
    if ([301, 302, 303, 307, 308].includes(result.status) && result.headers.location) {
      requested = new URL(result.headers.location, url).href;
      continue;
    }
    return { ...result, finalUrl: url.href };
  }
  throw new HttpError(422, "Trop de redirections lors du contrôle concurrentiel.");
}

function parseHtml(html: string) {
  const $ = cheerio.load(html);
  return {
    title: $("title").first().text().trim(),
    metaDescription: $('meta[name="description"]').attr("content")?.trim() ?? "",
    robots: $('meta[name="robots"]').attr("content")?.trim() ?? "",
    h1: $("h1")
      .map((_, item) => $(item).text().trim())
      .get()
      .join(" · "),
    h2Count: $("h2").length,
    schemaBlocks: $('script[type="application/ld+json"]').length,
    wordCount: $("body")
      .clone()
      .find("script,style,noscript")
      .remove()
      .end()
      .text()
      .trim()
      .split(/\s+/)
      .filter(Boolean).length,
  };
}

async function save(snapshot: CompetitorObservation) {
  await pool.query(
    `INSERT INTO competitor_observations(
      competitor_id,checked_at,url,final_url,status,title,meta_description,robots,h1,h2_count,schema_blocks,word_count,error
    ) VALUES($1,now(),$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      snapshot.competitorId,
      snapshot.url,
      snapshot.finalUrl,
      snapshot.status,
      snapshot.title,
      snapshot.metaDescription,
      snapshot.robots,
      snapshot.h1,
      snapshot.h2Count,
      snapshot.schemaBlocks,
      snapshot.wordCount,
      snapshot.error,
    ],
  );
}

export async function probeCompetitor(
  competitorId: string,
  site: string,
): Promise<CompetitorObservation> {
  const active = inFlight.get(competitorId);
  if (active) return active;
  const work = (async () => {
    const checkedAt = new Date().toISOString();
    try {
      const page = await requestPage(site);
      const snapshot: CompetitorObservation = {
        competitorId,
        checkedAt,
        url: site,
        finalUrl: page.finalUrl,
        status: page.status,
        ...parseHtml(page.html),
        error: page.status >= 400 ? `Réponse HTTP ${page.status}` : null,
      };
      await save(snapshot);
      return snapshot;
    } catch (error) {
      const snapshot: CompetitorObservation = {
        competitorId,
        checkedAt,
        url: site,
        finalUrl: null,
        status: null,
        title: "",
        metaDescription: "",
        robots: "",
        h1: "",
        h2Count: 0,
        schemaBlocks: 0,
        wordCount: 0,
        error: error instanceof Error ? error.message : "Contrôle concurrentiel interrompu.",
      };
      await save(snapshot);
      return snapshot;
    }
  })().finally(() => inFlight.delete(competitorId));
  inFlight.set(competitorId, work);
  return work;
}

export async function latestCompetitorObservations() {
  const result = await pool.query(`
    SELECT DISTINCT ON (competitor_id)
      competitor_id AS "competitorId", checked_at AS "checkedAt", url, final_url AS "finalUrl", status,
      title, meta_description AS "metaDescription", robots, h1, h2_count AS "h2Count",
      schema_blocks AS "schemaBlocks", word_count AS "wordCount", error
    FROM competitor_observations
    ORDER BY competitor_id, checked_at DESC
  `);
  return result.rows as CompetitorObservation[];
}

export async function probeAllCompetitors() {
  await ensureDefaultCompetitors();
  const result = await pool.query(
    "SELECT id,payload->>'site' AS site FROM records WHERE collection='competitors' ORDER BY updated_at",
  );
  const snapshots: CompetitorObservation[] = [];
  // Four concurrent public requests keep a manual refresh responsive without
  // turning a competitor check into an aggressive crawler.
  for (let start = 0; start < result.rows.length; start += 4) {
    const batch = await Promise.all(
      result.rows.slice(start, start + 4).map((row) => probeCompetitor(row.id, row.site)),
    );
    snapshots.push(...batch);
  }
  return snapshots;
}
