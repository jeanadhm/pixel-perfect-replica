import * as cheerio from "cheerio";
import { pool } from "./db";
import { crawlPage, allowedPublicUrl } from "./crawl";
import { SITES } from "../src/lib/demo/sites";
import { HttpError } from "./security";
import { config } from "./config";

const MAX_URLS_PER_SITE = 120;

function absolute(value: string, base: string) {
  try {
    return new URL(value, base).href;
  } catch {
    return null;
  }
}

async function fetchText(value: string) {
  const { url } = allowedPublicUrl(value);
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
    headers: { "User-Agent": "AMBS-Visibility-Hub/1.0 (+https://analytics.ambs-agency.com)" },
  });
  if (!response.ok) throw new HttpError(502, `Sitemap indisponible (HTTP ${response.status}).`);
  return response.text();
}

async function sitemapUrls(value: string, depth = 0): Promise<string[]> {
  if (depth > 2) return [];
  const xml = await fetchText(value);
  const $ = cheerio.load(xml, { xmlMode: true });
  const locs = $("loc")
    .map((_, element) => $(element).text().trim())
    .get();
  const urls: string[] = [];
  for (const loc of locs) {
    const target = absolute(loc, value);
    if (!target) continue;
    try {
      const { url } = allowedPublicUrl(target);
      if (/\.xml(?:$|\?)/i.test(url.pathname)) urls.push(...(await sitemapUrls(url.href, depth + 1)));
      else urls.push(url.href);
    } catch {
      // URLs outside the known public portfolio are deliberately ignored.
    }
    if (urls.length >= MAX_URLS_PER_SITE) break;
  }
  return urls;
}

async function urlsForSite(siteId: string) {
  const site = SITES.find((item) => item.id === siteId);
  if (!site) throw new HttpError(404, "Site inconnu.");
  const known = (
    await pool.query("SELECT url FROM public_observations WHERE site_id=$1 ORDER BY observed_at DESC", [
      siteId,
    ])
  ).rows.map((row) => row.url as string);
  const sitemapCandidates = [`${site.url}/sitemap.xml`];
  try {
    const robots = await fetchText(`${site.url}/robots.txt`);
    sitemapCandidates.push(
      ...robots
        .split(/\r?\n/)
        .map((line) => line.match(/^\s*sitemap\s*:\s*(\S+)/i)?.[1])
        .filter((line): line is string => Boolean(line)),
    );
  } catch {
    // A missing robots.txt does not prevent crawling known public pages.
  }
  const fromSitemaps = new Set<string>();
  for (const sitemap of sitemapCandidates) {
    try {
      for (const url of await sitemapUrls(sitemap)) fromSitemaps.add(url);
    } catch {
      // Try the next declared sitemap; the site root remains a safe fallback.
    }
  }
  return [...new Set([site.url + "/", ...known, ...fromSitemaps])].slice(0, MAX_URLS_PER_SITE);
}

export async function crawlSite(siteId: string, userId: string | null) {
  const urls = await urlsForSite(siteId);
  let completed = 0,
    failed = 0;
  for (let start = 0; start < urls.length; start += 4) {
    const batch = await Promise.allSettled(urls.slice(start, start + 4).map((url) => crawlPage(url, userId)));
    completed += batch.filter((result) => result.status === "fulfilled").length;
    failed += batch.filter((result) => result.status === "rejected").length;
  }
  return { siteId, discovered: urls.length, completed, failed };
}

export async function crawlAllSites(userId: string | null) {
  const results = [];
  for (const site of SITES) {
    try {
      results.push(await crawlSite(site.id, userId));
    } catch (error) {
      results.push({
        siteId: site.id,
        discovered: 0,
        completed: 0,
        failed: 1,
        error: error instanceof Error ? error.message : "Crawl indisponible",
      });
    }
  }
  return results;
}

export async function crawlDueSites() {
  const stale = await pool.query(`
    SELECT s.id FROM sites s
    LEFT JOIN public_observations o ON o.site_id=s.id
    GROUP BY s.id
    HAVING max(o.observed_at) IS NULL OR max(o.observed_at)<now()-($1::text || ' hours')::interval
  `, [String(config.autoCrawlIntervalHours)]);
  const results = [];
  for (const row of stale.rows) results.push(await crawlSite(row.id, null));
  return results;
}
