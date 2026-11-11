import { parse } from "csv-parse/sync";
import { z } from "zod";
import { pool, transaction } from "./db";
import { HttpError } from "./security";
import { SITES } from "../src/lib/demo/sites";
import { recordId } from "./seed";
const rowSchema = z.object({
  externalId: z.string().min(1).max(200),
  company: z.string().min(1).max(300),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (v) => Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
      "Date invalide",
    ),
  source: z.enum(["SEO", "GEO", "Direct", "Référent"]),
  channel: z.string().min(1),
  url: z
    .string()
    .url()
    .refine((v) => v.startsWith("https://")),
  value: z.coerce.number().nonnegative().default(0),
  status: z
    .enum(["Nouveau", "Qualifié", "Rendez-vous", "Proposition", "Client", "Perdu"])
    .default("Nouveau"),
  attributionEvidence: z.string().default(""),
});
export function parseLeads(csv: string) {
  let parsed: any[];
  try {
    parsed = parse(csv, {
      columns: true,
      bom: true,
      skip_empty_lines: true,
      trim: true,
      max_record_size: 20000,
    });
  } catch {
    throw new HttpError(400, "CSV invalide. Utilisez le modèle avec séparateur virgule.");
  }
  if (!parsed.length || parsed.length > 5000)
    throw new HttpError(400, "Importer entre 1 et 5 000 leads.");
  const rows = parsed.map((row, i) => {
    const result = rowSchema.safeParse({
      ...row,
      value: row.value || 0,
      status: row.status || "Nouveau",
    });
    if (!result.success)
      throw new HttpError(
        400,
        `Ligne ${i + 2} : ${result.error.issues.map((x) => x.path.join(".") + " " + x.message).join("; ")}`,
      );
    if (result.data.source === "GEO" && !result.data.attributionEvidence.trim())
      throw new HttpError(
        400,
        `Ligne ${i + 2} : justifiez l’attribution GEO (référent, UTM ou déclaration du prospect).`,
      );
    return result.data;
  });
  if (new Set(rows.map((r) => r.externalId)).size !== rows.length)
    throw new HttpError(400, "Identifiants externes dupliqués dans le fichier.");
  return rows;
}
export async function importLeads(siteId: string, system: string, csv: string, userId: string) {
  if (!SITES.some((s) => s.id === siteId) || !system.trim())
    throw new HttpError(400, "Choisissez le site et la source des leads.");
  const rows = parseLeads(csv);
  await transaction(async (client) => {
    await client.query("SELECT revision FROM workspace_revision WHERE id=1 FOR UPDATE");
    for (const row of rows) {
      const id = `lead-${recordId(siteId + "|" + system + "|" + row.externalId)}`;
      const payload = {
        id,
        siteId,
        company: row.company,
        source: row.source,
        channel: row.channel,
        origin: row.url,
        date: row.date,
        status: row.status,
        owner: "À attribuer",
        value: row.value,
        sourceSystem: system,
        sourceRecordId: row.externalId,
        evidenceUrl: row.url,
        attributionEvidence: row.attributionEvidence,
        importedAt: new Date().toISOString(),
      };
      await client.query(
        "INSERT INTO records(collection,id,site_id,payload,origin,source_url,observed_at,updated_by) VALUES('leads',$1,$2,$3,'csv',$4,now(),$5) ON CONFLICT(collection,id) DO UPDATE SET payload=jsonb_set(EXCLUDED.payload,'{owner}',COALESCE(records.payload->'owner',EXCLUDED.payload->'owner')),source_url=EXCLUDED.source_url,observed_at=now(),updated_by=EXCLUDED.updated_by,updated_at=now()",
        [id, siteId, JSON.stringify(payload), row.url, userId],
      );
    }
    await client.query("UPDATE workspace_revision SET revision=revision+1 WHERE id=1");
    await client.query(
      "INSERT INTO change_log(user_id,collection,operation) VALUES($1,'leads',$2)",
      [userId, `import CSV ${rows.length} lignes (${system})`],
    );
  });
  return rows.length;
}
