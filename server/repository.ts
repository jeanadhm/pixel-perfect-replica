import type pg from "pg";
import { pool, transaction } from "./db";
import { HttpError } from "./security";
import { stateSchema, type DemoState } from "../src/lib/demo/schema";
import { SITES, siteForUrl } from "../src/lib/demo/sites";
export const collections = [
  "keywords",
  "prompts",
  "geoTests",
  "actions",
  "pages",
  "leads",
  "audits",
  "backlinks",
  "competitors",
] as const;
export type Collection = (typeof collections)[number];
export function emptyState(): DemoState {
  return {
    keywords: [],
    families: [],
    prompts: [],
    geoTests: [],
    actions: [],
    pages: [],
    leads: [],
    audits: [],
    backlinks: [],
    competitors: [],
    period: "30j",
  };
}
export async function getWorkspace(client: pg.Pool | pg.PoolClient = pool) {
  const state = emptyState();
  const rows = (await client.query("SELECT collection,payload FROM records ORDER BY updated_at,id"))
    .rows;
  for (const row of rows) (state[row.collection as Collection] as unknown[]).push(row.payload);
  state.families = (await client.query("SELECT name FROM families ORDER BY name")).rows.map(
    (r) => r.name,
  );
  const revision = (await client.query("SELECT revision FROM workspace_revision WHERE id=1"))
    .rows[0].revision as number;
  return { state, revision };
}
export function validateRealData(collection: string, items: any[], names: string[]) {
  const accepted = new Set(["À attribuer", "", ...names]);
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) throw new HttpError(400, "Identifiant dupliqué");
    ids.add(item.id);
    if (item.siteId && !SITES.some((s) => s.id === item.siteId))
      throw new HttpError(400, "Site inconnu");
    for (const owner of [item.owner, item.plan?.owner].filter((x) => x != null))
      if (!accepted.has(owner))
        throw new HttpError(
          400,
          "Le responsable doit être un membre de l’équipe ou « À attribuer ».",
        );
    if (collection === "geoTests") {
      if (item.origin !== "Saisie manuelle")
        throw new HttpError(400, "Les simulations sont exclues du suivi réel.");
      if (
        item.response.trim().length < 40 ||
        item.response.trim().toLowerCase() === item.question.trim().toLowerCase()
      )
        throw new HttpError(400, "Copiez la réponse complète observée, pas la question.");
      if (!item.evidenceUrl || !/^https:\/\//.test(item.evidenceUrl))
        throw new HttpError(400, "Un lien de preuve HTTPS est requis pour une observation GEO.");
    }
    if (collection === "leads" && (!item.sourceSystem || !item.sourceRecordId || !item.evidenceUrl))
      throw new HttpError(
        400,
        "Chaque lead doit avoir une source, un identifiant externe et un lien de preuve.",
      );
    if (collection === "leads") {
      if (!/^https:\/\//.test(item.evidenceUrl) || !URL.canParse(item.evidenceUrl))
        throw new HttpError(400, "Le lien de preuve du lead doit être une URL HTTPS valide.");
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
        !Number.isFinite(Date.parse(item.date)) ||
        new Date(item.date).toISOString().slice(0, 10) !== item.date
      )
        throw new HttpError(400, "La date du lead est invalide.");
      if (item.source === "GEO" && !item.attributionEvidence?.trim())
        throw new HttpError(
          400,
          "Justifiez l’attribution GEO : référent, UTM ou déclaration du prospect.",
        );
    }
    if (
      collection === "keywords" &&
      item.measurements?.some((m: any) => /simulation|fictif/i.test(m.source))
    )
      throw new HttpError(400, "Les relevés simulés ne sont pas acceptés.");
  }
}
export async function saveCollection(
  collection: string,
  items: unknown,
  revision: number,
  userId: string,
) {
  if (![...collections, "families"].includes(collection))
    throw new HttpError(400, "Rubrique invalide");
  const parsed = stateSchema.safeParse({ ...emptyState(), [collection]: items });
  if (!parsed.success)
    throw new HttpError(
      400,
      "Données invalides : " +
        parsed.error.issues
          .slice(0, 3)
          .map((i) => i.path.join(".") + " " + i.message)
          .join("; "),
    );
  const values = (parsed.data as any)[collection] as any[];
  if (values.length > 20000) throw new HttpError(400, "Trop de lignes dans cette requête");
  return transaction(async (client) => {
    const current = (
      await client.query("SELECT revision FROM workspace_revision WHERE id=1 FOR UPDATE")
    ).rows[0].revision;
    if (current !== revision)
      throw new HttpError(
        409,
        "Les données ont été modifiées ailleurs. Rechargez avant de réessayer.",
      );
    const names = (await client.query("SELECT name FROM users")).rows.map((r) => r.name);
    if (collection === "families") {
      await client.query("DELETE FROM families");
      for (const name of [...new Set(values)])
        await client.query("INSERT INTO families(name) VALUES($1)", [name]);
    } else {
      validateRealData(collection, values, names);
      const previous = (
        await client.query("SELECT id,payload,origin FROM records WHERE collection=$1", [
          collection,
        ])
      ).rows;
      const old = new Map(previous.map((r) => [r.id, r]));
      for (const item of values) {
        const before = old.get(item.id);
        if (before && JSON.stringify(before.payload) === JSON.stringify(item)) continue;
        // Connector observations are read-only: corrections belong in the source console.
        if (before?.origin === "gsc" && collection === "keywords") {
          for (const field of [
            "term",
            "url",
            "siteId",
            "measurements",
            "position",
            "previous",
            "history",
            "lastCheck",
          ])
            if (JSON.stringify(before.payload[field]) !== JSON.stringify(item[field]))
              throw new HttpError(
                400,
                "Les mesures Search Console ne peuvent pas être modifiées manuellement.",
              );
        }
        const siteId = item.siteId ?? siteForUrl(item.url ?? item.target ?? "")?.id ?? "ambs";
        await client.query(
          "INSERT INTO records(collection,id,site_id,payload,updated_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT(collection,id) DO UPDATE SET payload=EXCLUDED.payload,site_id=EXCLUDED.site_id,updated_by=EXCLUDED.updated_by,updated_at=now()",
          [collection, item.id, siteId, JSON.stringify({ ...item, siteId }), userId],
        );
        await client.query(
          "INSERT INTO change_log(user_id,collection,record_id,operation) VALUES($1,$2,$3,$4)",
          [userId, collection, item.id, before ? "update" : "create"],
        );
      }
      const removed = previous.filter((row) => !values.some((item) => item.id === row.id));
      for (const row of removed) {
        await client.query("DELETE FROM records WHERE collection=$1 AND id=$2", [
          collection,
          row.id,
        ]);
        await client.query(
          "INSERT INTO change_log(user_id,collection,record_id,operation) VALUES($1,$2,$3,$4)",
          [userId, collection, row.id, "delete"],
        );
      }
    }
    await client.query("UPDATE workspace_revision SET revision=revision+1 WHERE id=1");
    return current + 1;
  });
}
