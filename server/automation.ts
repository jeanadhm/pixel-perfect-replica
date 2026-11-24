import { createHash } from "node:crypto";
import { pool, transaction } from "./db";
import { GOOGLE_SITES } from "../src/lib/demo/sites";

type Candidate = {
  key: string;
  siteId: string;
  title: string;
  description: string;
  category: "SEO" | "GEO";
  priority: "Haute" | "Moyenne";
  target: string;
  kpi: string;
  proofUrl?: string;
};

const idFor = (key: string) =>
  `auto-${createHash("sha256").update(key).digest("hex").slice(0, 20)}`;

function actionFor(candidate: Candidate, existing?: Record<string, unknown>) {
  const wasResolved = existing?.["status"] === "Terminé";
  return {
    id: idFor(candidate.key),
    siteId: candidate.siteId,
    title: candidate.title,
    description: candidate.description,
    category: candidate.category,
    priority: candidate.priority,
    owner: typeof existing?.["owner"] === "string" ? existing["owner"] : "À attribuer",
    start: "",
    due: typeof existing?.["due"] === "string" ? existing["due"] : "",
    status: wasResolved ? "À faire" : (existing?.["status"] ?? "À faire"),
    target: candidate.target,
    deliverable: "Vérification documentée et correction validée.",
    kpi: candidate.kpi,
    comments:
      "[Automatique] Créée à partir d’une source réellement indisponible ou en erreur. Elle se termine automatiquement lorsque la condition disparaît.",
    recurrence: "Ponctuelle",
    baseline: null,
    goal: null,
    result: null,
    metricUnit: "",
    proofUrl: candidate.proofUrl ?? "",
  };
}

async function candidates(): Promise<Candidate[]> {
  const integrations = await pool.query(`
    SELECT i.site_id,i.gsc_property,i.ga4_property,
      (SELECT status FROM sync_runs r WHERE r.site_id=i.site_id AND r.provider='gsc' ORDER BY started_at DESC LIMIT 1) AS gsc_status,
      (SELECT message FROM sync_runs r WHERE r.site_id=i.site_id AND r.provider='gsc' ORDER BY started_at DESC LIMIT 1) AS gsc_message,
      (SELECT status FROM sync_runs r WHERE r.site_id=i.site_id AND r.provider='ga4' ORDER BY started_at DESC LIMIT 1) AS ga4_status,
      (SELECT message FROM sync_runs r WHERE r.site_id=i.site_id AND r.provider='ga4' ORDER BY started_at DESC LIMIT 1) AS ga4_message
    FROM integrations i
  `);
  const next: Candidate[] = [];
  for (const site of GOOGLE_SITES) {
    const row = integrations.rows.find((integration) => integration.site_id === site.id);
    for (const provider of ["gsc", "ga4"] as const) {
      const label = provider === "gsc" ? "Search Console" : "Google Analytics 4";
      const property = row?.[`${provider}_property`];
      const status = row?.[`${provider}_status`];
      const message = row?.[`${provider}_message`];
      if (!property) {
        next.push({
          key: `${site.id}:${provider}:missing`,
          siteId: site.id,
          title: `Relier ${label} — ${site.name}`,
          description: `Aucune propriété ${label} compatible n’est accessible avec le compte connecté. Ajoutez l’accès ou le flux exact pour ${site.host}.`,
          category: "SEO",
          priority: "Moyenne",
          target: site.url,
          kpi: `Source ${label} reliée`,
          proofUrl: site.url,
        });
      } else if (status === "error") {
        next.push({
          key: `${site.id}:${provider}:error`,
          siteId: site.id,
          title: `Corriger ${label} — ${site.name}`,
          description: `Le dernier relevé ${label} a échoué : ${message || "raison non précisée"}`,
          category: "SEO",
          priority: "Haute",
          target: site.url,
          kpi: `Relevé ${label} réussi`,
          proofUrl: site.url,
        });
      }
    }
  }
  const competitorRows = await pool.query(`
    SELECT r.id,r.payload->>'name' AS name,r.payload->>'site' AS site,o.error
    FROM records r
    LEFT JOIN LATERAL (
      SELECT error FROM competitor_observations
      WHERE competitor_id=r.id ORDER BY checked_at DESC LIMIT 1
    ) o ON true
    WHERE r.collection='competitors' AND o.error IS NOT NULL
  `);
  for (const row of competitorRows.rows)
    next.push({
      key: `competitor:${row.id}:unreachable`,
      siteId: "ambs",
      title: `Vérifier le concurrent ${row.name || row.site}`,
      description: `Le dernier relevé public a échoué : ${row.error}. Vérifiez l’URL suivie ou relancez le contrôle.`,
      category: "GEO",
      priority: "Moyenne",
      target: row.site,
      kpi: "Relevé concurrentiel public réussi",
      proofUrl: row.site,
    });
  const crawlRows = await pool.query(`
    SELECT site_id,
      count(*) FILTER (WHERE coalesce((payload->>'status')::int, 0) < 200 OR coalesce((payload->>'status')::int, 0) >= 400)::int AS unavailable,
      count(*) FILTER (WHERE coalesce((payload->'technical'->>'h1Count')::int, 0) <> 1)::int AS h1_issues,
      count(*) FILTER (WHERE coalesce(payload->'technical'->>'meta', '') = '')::int AS meta_issues
    FROM public_observations
    GROUP BY site_id
  `);
  for (const row of crawlRows.rows) {
    const site = GOOGLE_SITES.find((candidate) => candidate.id === row.site_id);
    if (!site) continue;
    const unavailable = Number(row.unavailable ?? 0),
      h1Issues = Number(row.h1_issues ?? 0),
      metaIssues = Number(row.meta_issues ?? 0);
    if (!unavailable && !h1Issues && !metaIssues) continue;
    const findings = [
      unavailable ? `${unavailable} URL indisponible(s)` : "",
      h1Issues ? `${h1Issues} H1 à vérifier` : "",
      metaIssues ? `${metaIssues} meta description(s) absente(s)` : "",
    ].filter(Boolean);
    next.push({
      key: `${site.id}:crawl:technical`,
      siteId: site.id,
      title: `Traiter les alertes techniques — ${site.name}`,
      description: `Le dernier crawl public signale : ${findings.join(" · ")}. Ouvrez Pages & Contenus pour les URL et les preuves HTTP.`,
      category: "SEO",
      priority: unavailable ? "Haute" : "Moyenne",
      target: site.url,
      kpi: "Alertes techniques résolues",
      proofUrl: site.url,
    });
  }
  return next;
}

/** Creates, restores or resolves only actions owned by this automation. */
export async function reconcileAutomaticActions() {
  const next = await candidates();
  return transaction(async (client) => {
    const existing = await client.query(
      "SELECT id,payload FROM records WHERE collection='actions' AND origin='automatic' FOR UPDATE",
    );
    const known = new Map(
      existing.rows.map((row) => [row.id, row.payload as Record<string, unknown>]),
    );
    const expected = new Set(next.map((candidate) => idFor(candidate.key)));
    let created = 0,
      restored = 0,
      resolved = 0;
    for (const candidate of next) {
      const id = idFor(candidate.key);
      const previous = known.get(id);
      if (!previous) created++;
      else if (previous["status"] === "Terminé") restored++;
      const payload = actionFor(candidate, previous);
      await client.query(
        `INSERT INTO records(collection,id,site_id,payload,origin,observed_at)
         VALUES('actions',$1,$2,$3,'automatic',now())
         ON CONFLICT(collection,id) DO UPDATE SET payload=EXCLUDED.payload,site_id=EXCLUDED.site_id,observed_at=now(),updated_at=now()`,
        [id, candidate.siteId, JSON.stringify(payload)],
      );
    }
    for (const row of existing.rows) {
      if (expected.has(row.id) || row.payload["status"] === "Terminé") continue;
      await client.query(
        "UPDATE records SET payload=jsonb_set(payload,'{status}','\"Terminé\"'::jsonb,true),updated_at=now(),observed_at=now() WHERE collection='actions' AND id=$1",
        [row.id],
      );
      resolved++;
    }
    if (created || restored || resolved)
      await client.query("UPDATE workspace_revision SET revision=revision+1 WHERE id=1");
    return { created, restored, resolved, active: next.length };
  });
}
