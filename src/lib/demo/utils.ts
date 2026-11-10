import type { Keyword, KwStatus } from "./types";
import { daily, TODAY } from "./seed";

export const nf = (n: number, d = 0) => n.toLocaleString("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: d });
export const pct = (n: number, d = 1) => `${nf(n, d)} %`;
export const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
export const fdate = (s: string) => new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
export const fdatetime = (s: string) => new Date(s).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function kwStatus(k: Keyword): KwStatus {
  if (k.position === null) return "Invisible";
  return k.position <= 20 ? "Visible" : "Faible visibilité";
}
export function kwTrend(k: Keyword): number {
  if (k.position === null || k.previous === null) return 0;
  return k.previous - k.position; // positive = gained places
}
export function positionBuckets(kws: Keyword[]) {
  const b = { "Top 3": 0, "4 – 10": 0, "11 – 20": 0, "21 – 50": 0, "> 50": 0, "Non positionnés": 0 };
  for (const k of kws) {
    const p = k.position;
    if (p === null) b["Non positionnés"]++;
    else if (p <= 3) b["Top 3"]++;
    else if (p <= 10) b["4 – 10"]++;
    else if (p <= 20) b["11 – 20"]++;
    else if (p <= 50) b["21 – 50"]++;
    else b["> 50"]++;
  }
  return Object.entries(b).map(([name, value]) => ({ name, value }));
}

export function windowStats(days: number, offset = 0) {
  const end = daily.length - offset;
  const slice = daily.slice(Math.max(0, end - days), end);
  const impressions = slice.reduce((s, p) => s + p.impressions, 0);
  const clicks = slice.reduce((s, p) => s + p.clicks, 0);
  const sessions = slice.reduce((s, p) => s + p.sessions, 0);
  const position = slice.reduce((s, p) => s + p.position, 0) / (slice.length || 1);
  return { slice, impressions, clicks, sessions, ctr: (clicks / (impressions || 1)) * 100, position, conversions: Math.round(sessions * 0.021) };
}
export const change = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
export const daysAgo = (iso: string) => (TODAY.getTime() - new Date(iso).getTime()) / 86400000;

// Aggregate daily points to weekly/monthly buckets for long periods.
export function seriesFor(days: number) {
  const s = windowStats(days).slice;
  if (days <= 30) return s.map((p) => ({ ...p, label: new Date(p.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) }));
  const size = days <= 90 ? 7 : 30;
  const out = [];
  for (let i = 0; i < s.length; i += size) {
    const g = s.slice(i, i + size);
    out.push({
      label: new Date(g[0].date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      impressions: g.reduce((a, p) => a + p.impressions, 0),
      clicks: g.reduce((a, p) => a + p.clicks, 0),
      firstPage: Math.round(g.reduce((a, p) => a + p.firstPage, 0) / g.length),
      geo: Math.round((g.reduce((a, p) => a + p.geo, 0) / g.length) * 10) / 10,
      position: Math.round((g.reduce((a, p) => a + p.position, 0) / g.length) * 10) / 10,
    });
  }
  return out;
}
