import * as cheerio from "cheerio";
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
    throw new HttpError(400, "Seules les URL HTTPS des quatre sites AMBS sont autorisées.");
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
  return { ...payload, checkedAt: new Date().toISOString() };
}
