import type { Keyword, KwStatus } from "./types";
import type { SiteScope } from "./sites";


export const nf = (n: number | null, d = 0) =>
  n === null
    ? "—"
    : n.toLocaleString("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: d });
export const pct = (n: number, d = 1) => `${nf(n, d)} %`;
export const eur = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
export const fdate = (s: string) =>
  !s
    ? "Non renseignée"
    : new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
export const fdatetime = (s: string) =>
  new Date(s).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export function kwStatus(k: Keyword): KwStatus {
  if (!k.lastCheck) return "À mesurer";
  if (k.position === null) return "Invisible";
  return k.position <= 20 ? "Visible" : "Faible visibilité";
}
export function kwTrend(k: Keyword): number {
  if (k.position === null || k.previous == null) return 0;
  return k.previous - k.position; // positive = gained places
}
export function positionBuckets(kws: Keyword[]) {
  const b = {
    "Top 3": 0,
    "4 – 10": 0,
    "11 – 20": 0,
    "21 – 50": 0,
    "> 50": 0,
    "Non positionnés": 0,
  };
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

export const change = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
export const daysAgo = (iso: string) => (Date.now() - new Date(iso).getTime()) / 86400000;
