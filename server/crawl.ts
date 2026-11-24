import * as cheerio from "cheerio";
import { createHash } from "node:crypto";
import { pool, transaction } from "./db";
import { HttpError } from "./security";
import { siteForUrl } from "../src/lib/demo/sites";
export function allowedPublicUrl(value: string) {
  const url = new URL(value),
    site = siteForUrl(value);
  if (
    !site ||
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  )
    throw new HttpError(400, "Seules les URL HTTPS des sites suivis sont autorisées.");
  if (
    /\/(admin|auth|api|logout|login|connexion|signup|dashboard)(\/|$)/i.test(
      decodeURIComponent(url.pathname),
    )
  )
    throw new HttpError(400, "Les espaces privés sont exclus du crawl.");
  url.hash = "";
  return { url, site };
}
export async function crawlPage(value: string, userId: string | null) {
  const initial = allowedPublicUrl(value);
  let url = initial.url;
  let response: Response | undefined;
  for (let i = 0; i < 4; i++) {
    response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "AMBS-Visibility-Hub/1.0" },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) break;
      url = allowedPublicUrl(new URL(location, url).href).url;
      continue;
    }
    break;
  }
  if (!response) throw new HttpError(502, "Réponse absente");
  const reader = response.body?.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  if (reader)
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 3000000) {
        await reader.cancel();
        throw new HttpError(422, "Page trop volumineuse pour ce relevé.");
      }
      chunks.push(value);
    }
  const html = Buffer.concat(chunks).toString("utf8"),
    $ = cheerio.load(html);
  const schemaTypes = new Set<string>();
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const values = JSON.parse($(element).text());
      const visit = (item: unknown) => {
        if (Array.isArray(item)) return item.forEach(visit);
        if (!item || typeof item !== "object") return;
        const type = (item as Record<string, unknown>)["@type"];
        (Array.isArray(type) ? type : [type]).forEach((value) => {
          if (typeof value === "string") schemaTypes.add(value);
        });
        const graph = (item as Record<string, unknown>)["@graph"];
        if (graph) visit(graph);
      };
      visit(values);
    } catch {
      // Invalid JSON-LD is captured by the score through its absence, not treated as a crawler error.
    }
  });
  const payload = {
    url: initial.url.href,
    finalUrl: url.href,
    status: response.status,
    title: $("title").first().text().trim(),
    h1: $("h1")
      .map((_, el) => $(el).text().trim())
      .get()
      .join(" · "),
    name: $("title").first().text().trim() || initial.url.pathname,
    meta: $('meta[name="description"]').attr("content") ?? "",
    source: "Relevé HTTP depuis Express",
    technical: {
      meta: $('meta[name="description"]').attr("content") ?? "",
      canonical: $('link[rel="canonical"]').attr("href") ?? "",
      robots: $('meta[name="robots"]').attr("content") ?? "",
      h1Count: $("h1").length,
      h2Count: $("h2").length,
      h2: $("h2")
        .map((_, el) => $(el).text().trim())
        .get()
        .join(" · "),
      imageCount: $("img").length,
      missingAltCount: $("img:not([alt])").length,
      internalLinks: $("a[href]").filter((_, el) => {
        try {
          return new URL($(el).attr("href")!, url).hostname === url.hostname;
        } catch {
          return false;
        }
      }).length,
      schemaBlocks: $('script[type="application/ld+json"]').length,
      schemaTypes: [...schemaTypes],
      wordCount: $("body")
        .clone()
        .find("script,style,noscript")
        .remove()
        .end()
        .text()
        .trim()
        .split(/\s+/)
        .filter(Boolean).length,
    },
  };
  await transaction(async (client) => {
    await client.query(
      "INSERT INTO public_observations(url,site_id,observed_at,payload) VALUES($1,$2,now(),$3) ON CONFLICT(url) DO UPDATE SET payload=EXCLUDED.payload,observed_at=now()",
      [initial.url.href, initial.site.id, JSON.stringify(payload)],
    );
    await client.query(
      "INSERT INTO change_log(user_id,collection,record_id,operation) VALUES($1,'public_observations',$2,'crawl')",
      [userId, initial.url.href],
    );
  });
  await synchronizePageRecord(initial.site.id, payload);
  return { ...payload, checkedAt: new Date().toISOString() };
}

function pageRecordId(url: string) {
  return `crawl-${createHash("sha256").update(url).digest("hex").slice(0, 24)}`;
}

function pageType(url: string) {
  if (/\/blog\//i.test(url)) return "Article de blog";
  if (/\/(cas-clients|case-studies)\//i.test(url)) return "Étude de cas";
  if (/\/(solution|services?)\//i.test(url)) return "Page solution";
  return "Page institutionnelle";
}

function technicalScore(payload: any) {
  const technical = payload.technical;
  let score = payload.status >= 200 && payload.status < 400 ? 20 : 0;
  if (payload.title.length >= 30 && payload.title.length <= 65) score += 15;
  if (technical.meta.length >= 70 && technical.meta.length <= 165) score += 15;
  if (technical.h1Count === 1) score += 15;
  if (technical.canonical) score += 10;
  if (technical.schemaBlocks) score += 10;
  if (!technical.missingAltCount) score += 5;
  if (technical.internalLinks > 0) score += 10;
  return score;
}

async function synchronizePageRecord(siteId: string, payload: any) {
  const id = pageRecordId(payload.url);
  await transaction(async (client) => {
    const existing = (
      await client.query(
        "SELECT id,payload FROM records WHERE collection='pages' AND (id=$1 OR payload->>'url'=$2) ORDER BY updated_at DESC LIMIT 1",
        [id, payload.url],
      )
    ).rows[0];
    const technical = payload.technical;
    const type = technical.schemaTypes?.find((item: string) =>
      ["Organization", "Service", "FAQPage", "Article"].includes(item),
    );
    const page = {
      ...existing?.payload,
      id: existing?.id ?? id,
      siteId,
      name: payload.h1 || payload.title || new URL(payload.url).pathname,
      url: payload.url,
      type: existing?.payload?.type ?? pageType(payload.url),
      family: existing?.payload?.family ?? "À qualifier",
      mainKeyword: existing?.payload?.mainKeyword ?? "",
      keywordCount: existing?.payload?.keywordCount ?? 0,
      published: payload.status >= 200 && payload.status < 400 ? "Publiée" : "À vérifier",
      indexed: /noindex/i.test(technical.robots) ? "Non indexée" : "À vérifier",
      score: technicalScore(payload),
      clicks: existing?.payload?.clicks ?? null,
      lastOptimized: existing?.payload?.lastOptimized ?? "",
      owner: existing?.payload?.owner ?? "À attribuer",
      title: payload.title,
      meta: technical.meta,
      h1: payload.h1,
      h2: technical.h2,
      canonical: technical.canonical,
      internalLinks: technical.internalLinks,
      schema: type ?? (technical.schemaBlocks ? "À vérifier" : "Aucune"),
      geoContent: existing?.payload?.geoContent ?? false,
    };
    await client.query(
      `INSERT INTO records(collection,id,site_id,payload,origin,source_url,observed_at)
       VALUES('pages',$1,$2,$3,'public_html',$4,now())
       ON CONFLICT(collection,id) DO UPDATE SET payload=EXCLUDED.payload,site_id=EXCLUDED.site_id,source_url=EXCLUDED.source_url,observed_at=now(),updated_at=now()`,
      [page.id, siteId, JSON.stringify(page), payload.url],
    );
    await client.query("UPDATE workspace_revision SET revision=revision+1 WHERE id=1");
  });
}
