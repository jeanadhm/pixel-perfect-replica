import type { Keyword, KeywordMeasurement, KeywordPlan } from "./types";
export const KEYWORD_STAGES = [
  "À qualifier",
  "À cibler",
  "À intégrer",
  "Intégré",
  "À optimiser",
  "À surveiller",
  "Archivé",
] as const;
export const PLACEMENTS = [
  "Title",
  "Meta description",
  "H1",
  "H2",
  "Corps du contenu",
  "FAQ",
  "Liens internes",
] as const;
export function keywordPlan(keyword: Keyword): KeywordPlan {
  return (
    keyword.plan ?? {
      stage: "À qualifier",
      priority: "Moyenne",
      owner: "",
      targetPosition: null,
      placements: [],
      contentUrl: keyword.url,
      updatedAt: "",
    }
  );
}
// Rebuild the current metrics from chronological manual observations. Imported demo
// positions are deliberately excluded from comparisons against real manual inputs.
export function withMeasurement(keyword: Keyword, measurement: KeywordMeasurement): Keyword {
  const measurements = [
    ...(keyword.measurements ?? []).filter((m) => m.date !== measurement.date),
    measurement,
  ].sort((a, b) => a.date.localeCompare(b.date));
  const latest = measurements.at(-1)!;
  const previous = measurements.at(-2);
  return {
    ...keyword,
    measurements,
    position: latest.position,
    previous: previous?.position ?? null,
    lastCheck: latest.date,
    history: measurements.map((m) => ({ week: m.date, position: m.position })),
  };
}
export function parseKeywordLines(text: string, existing: readonly string[]) {
  const seen = new Set(existing.map((term) => term.trim().toLocaleLowerCase("fr")));
  const terms: string[] = [];
  let duplicates = 0;
  for (const line of text.split(/\r?\n/)) {
    const term = line.trim().replace(/^[-•]\s+/, "");
    if (!term) continue;
    const key = term.toLocaleLowerCase("fr");
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    terms.push(term);
  }
  return { terms, duplicates };
}

export function keywordExportRows(keywords: Keyword[]) {
  return keywords.map((k) => {
    const plan = keywordPlan(k);
    return {
      expression: k.term,
      famille: k.family,
      intention: k.intent,
      position: k.position ?? "",
      volume: k.volume,
      difficulte: k.difficulty,
      etape: plan.stage,
      priorite: plan.priority,
      responsable: plan.owner,
      position_cible: plan.targetPosition,
      page_cible: plan.contentUrl,
      emplacements: plan.placements.join(", "),
      notes: k.notes,
      releves_manuels: k.measurements?.length ?? 0,
    };
  });
}

export const RECURRENCES = [
  "Ponctuelle",
  "Hebdomadaire",
  "Bimensuelle",
  "Mensuelle",
  "Trimestrielle",
] as const;
export function nextDueDate(date: string, recurrence: (typeof RECURRENCES)[number]) {
  const current = new Date(`${date}T12:00:00Z`);
  if (recurrence === "Mensuelle" || recurrence === "Trimestrielle") {
    const day = current.getUTCDate();
    current.setUTCDate(1);
    current.setUTCMonth(current.getUTCMonth() + (recurrence === "Mensuelle" ? 1 : 3));
    const last = new Date(
      Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0),
    ).getUTCDate();
    current.setUTCDate(Math.min(day, last));
  } else
    current.setUTCDate(
      current.getUTCDate() +
        (recurrence === "Hebdomadaire" ? 7 : recurrence === "Bimensuelle" ? 14 : 0),
    );
  return current.toISOString().slice(0, 10);
}
