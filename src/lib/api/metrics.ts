import type { Metrics } from "./types";
export function coverage(metrics: Metrics | null, provider: "gsc" | "ga4") {
  const sites = metrics?.siteIds ?? [...new Set(metrics?.runs.map((r) => r.site_id) ?? [])];
  const dates: string[] = [];
  if (metrics) {
    for (
      let t = Date.parse(metrics.startDate);
      t <= Date.parse(metrics.endDate) && dates.length < 366;
      t += 86400000
    )
      dates.push(new Date(t).toISOString().slice(0, 10));
  }
  let covered = 0;
  for (const site of sites)
    for (const date of dates)
      if (
        metrics?.runs.some(
          (r) =>
            r.provider === provider &&
            r.site_id === site &&
            r.start_date <= date &&
            r.end_date >= date,
        )
      )
        covered++;
  const total = dates.length * sites.length;
  return {
    covered,
    total,
    complete: total > 0 && covered === total,
    label: total
      ? `${covered}/${total} jours de données couverts sur ${sites.length} site(s)`
      : "Aucune couverture mesurée",
  };
}
export function summarize(metrics: Metrics | null) {
  const rows = metrics?.search ?? [],
    ga = metrics?.analytics ?? [];
  const searchKnown = !!metrics?.runs.some((r) => r.provider === "gsc"),
    gaKnown = !!metrics?.runs.some((r) => r.provider === "ga4");
  const impressions = rows.reduce((n, r) => n + r.impressions, 0),
    clicks = rows.reduce((n, r) => n + r.clicks, 0);
  const days = [...new Set(rows.map((r) => r.day))].sort().map((day) => {
    const group = rows.filter((r) => r.day === day);
    return {
      label: day.slice(5),
      date: day,
      impressions: group.reduce((n, r) => n + r.impressions, 0),
      clicks: group.reduce((n, r) => n + r.clicks, 0),
    };
  });
  return {
    impressions: searchKnown ? impressions : null,
    clicks: searchKnown ? clicks : null,
    ctr: searchKnown && impressions ? (clicks / impressions) * 100 : null,
    position:
      searchKnown && impressions
        ? rows.reduce((n, r) => n + r.position * r.impressions, 0) / impressions
        : null,
    sessions: gaKnown ? ga.reduce((n, r) => n + r.sessions, 0) : null,
    keyEvents: gaKnown ? ga.reduce((n, r) => n + r.key_events, 0) : null,
    aiSessions: gaKnown
      ? ga
          .filter((r) =>
            /^(chatgpt\.com|chat\.openai\.com|perplexity\.ai|gemini\.google\.com|copilot\.microsoft\.com)(\/|$)/i.test(
              r.source,
            ),
          )
          .reduce((n, r) => n + r.sessions, 0)
      : null,
    days,
    searchKnown,
    gaKnown,
  };
}
