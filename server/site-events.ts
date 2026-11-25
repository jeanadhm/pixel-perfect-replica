import { z } from "zod";
import { config } from "./config";
import { pool, transaction } from "./db";
import { HttpError } from "./security";
import { SITES } from "../src/lib/demo/sites";

const remoteResponse = z.object({
  rows: z.array(
    z.object({
      day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      name: z.string().min(1).max(80),
      path: z.string().max(300),
      label: z.string().max(120).nullable().optional(),
      destination: z.string().max(300).nullable().optional(),
      events: z.number().finite().nonnegative(),
      uniqueVisitors: z.number().finite().nonnegative(),
    }),
  ),
});

type EventExport = { url: string; token: string };
export type SiteEventSummary = {
  startDate: string;
  endDate: string;
  items: Array<{
    name: string;
    path: string;
    label: string;
    destination: string;
    events: number;
    uniqueVisitors: number;
    lastSeenAt: string;
  }>;
};

function exportsBySite(): Record<string, EventExport> {
  if (!config.siteEventExports) return {};
  try {
    const parsed = JSON.parse(config.siteEventExports) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([siteId, value]) => {
        if (!value || typeof value !== "object") return [];
        const candidate = value as Partial<EventExport>;
        if (typeof candidate.url !== "string" || typeof candidate.token !== "string") return [];
        try {
          const url = new URL(candidate.url);
          if (!["https:", "http:"].includes(url.protocol)) return [];
          return [[siteId, { url: url.toString(), token: candidate.token }] as const];
        } catch {
          return [];
        }
      }),
    );
  } catch {
    return {};
  }
}

export function siteEventExportsConfigured() {
  return Object.keys(exportsBySite()).length > 0;
}

export function configuredSiteEventExportIds() {
  return Object.keys(exportsBySite());
}

function isoDay(daysAgo = 0) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function assertSite(siteId: string) {
  if (!SITES.some((site) => site.id === siteId)) throw new HttpError(404, "Site inconnu.");
}

/** Pulls anonymous, pre-aggregated conversion events from one managed site. */
export async function syncSiteEvents(siteId: string, startDate = isoDay(29), endDate = isoDay()) {
  assertSite(siteId);
  const source = exportsBySite()[siteId];
  if (!source)
    throw new HttpError(
      503,
      "Le flux d’interactions de ce site n’est pas configuré dans SITE_EVENT_EXPORTS.",
    );
  const url = new URL(source.url);
  url.searchParams.set("startDate", startDate);
  url.searchParams.set("endDate", endDate);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${source.token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new HttpError(
      502,
      `Le site source a refusé le relevé d’interactions (HTTP ${response.status}).`,
    );
  const data = remoteResponse.parse(body);
  await transaction(async (client) => {
    await client.query(
      "DELETE FROM site_event_daily WHERE site_id=$1 AND day BETWEEN $2::date AND $3::date",
      [siteId, startDate, endDate],
    );
    for (const row of data.rows) {
      await client.query(
        `INSERT INTO site_event_daily(site_id,day,name,path,label,destination,events,unique_visitors,source_url,fetched_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
         ON CONFLICT(site_id,day,name,path,label,destination) DO UPDATE
         SET events=EXCLUDED.events, unique_visitors=EXCLUDED.unique_visitors,
             source_url=EXCLUDED.source_url, fetched_at=now()`,
        [
          siteId,
          row.day,
          row.name,
          row.path,
          row.label ?? "",
          row.destination ?? "",
          row.events,
          row.uniqueVisitors,
          source.url,
        ],
      );
    }
  });
  return { siteId, rows: data.rows.length, startDate, endDate, fetchedAt: new Date().toISOString() };
}

export async function syncConfiguredSiteEvents() {
  const entries = Object.keys(exportsBySite());
  const results = await Promise.allSettled(entries.map((siteId) => syncSiteEvents(siteId)));
  return {
    configured: entries.length,
    completed: results.filter((result) => result.status === "fulfilled").length,
    failed: results.filter((result) => result.status === "rejected").length,
  };
}

export async function siteEventSummary(siteId: string, startDate: string, endDate: string): Promise<SiteEventSummary> {
  if (siteId !== "all") assertSite(siteId);
  const filter = siteId === "all" ? [] : [siteId];
  const siteCondition = siteId === "all" ? "" : "AND site_id=$3";
  const result = await pool.query(
    `SELECT name, path, label, destination,
      SUM(events)::float8 AS events, SUM(unique_visitors)::float8 AS "uniqueVisitors",
      MAX(fetched_at)::text AS "lastSeenAt"
     FROM site_event_daily
     WHERE day BETWEEN $1::date AND $2::date ${siteCondition}
     GROUP BY name,path,label,destination
     ORDER BY SUM(events) DESC, MAX(fetched_at) DESC
     LIMIT 100`,
    [startDate, endDate, ...filter],
  );
  return { startDate, endDate, items: result.rows };
}
