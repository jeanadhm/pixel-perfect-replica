import { randomBytes, createHash } from "node:crypto";
import { pool, transaction } from "./db";
import { config } from "./config";
import { encrypt, decrypt, hashToken, HttpError } from "./security";
import { SITES } from "../src/lib/demo/sites";
import { recordId } from "./seed";
const scopes = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/analytics.readonly",
];
type Tokens = { access_token: string; refresh_token?: string; expires_at: number };
export function googleConfigured() {
  return !!(config.googleClientId && config.googleClientSecret && config.encryptionKey);
}
async function jsonFetch(url: string, options: RequestInit = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(30000) });
  if (!response.ok)
    throw new HttpError(
      502,
      `Google a refusé la requête (HTTP ${response.status}). Vérifiez les autorisations, la propriété et les API activées.`,
    );
  return response.json() as Promise<any>;
}
export async function authorizationUrl(userId: string) {
  if (!googleConfigured())
    throw new HttpError(
      503,
      "Configurer GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET et TOKEN_ENCRYPTION_KEY sur le serveur.",
    );
  const state = randomBytes(32).toString("base64url"),
    verifier = randomBytes(48).toString("base64url");
  await pool.query("DELETE FROM oauth_states WHERE expires_at<now()");
  await pool.query(
    "INSERT INTO oauth_states(state_hash,user_id,verifier,expires_at) VALUES($1,$2,$3,now()+interval '10 minutes')",
    [hashToken(state), userId, verifier],
  );
  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: config.googleRedirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    state,
    access_type: "offline",
    prompt: "consent",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}
export async function finishAuthorization(state: string, code: string, userId: string) {
  const result = await pool.query(
    "DELETE FROM oauth_states WHERE state_hash=$1 AND user_id=$2 AND expires_at>now() RETURNING verifier",
    [hashToken(state), userId],
  );
  if (!result.rowCount)
    throw new HttpError(400, "Autorisation expirée ou invalide. Recommencez la connexion.");
  const token = await jsonFetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      redirect_uri: config.googleRedirectUri,
      grant_type: "authorization_code",
      code_verifier: result.rows[0].verifier,
    }),
  });
  if (!token.access_token || !token.refresh_token)
    throw new HttpError(
      400,
      "Google n’a pas fourni l’accès hors ligne. Reconnectez avec consentement.",
    );
  await pool.query(
    "INSERT INTO google_tokens(id,encrypted_token) VALUES(1,$1) ON CONFLICT(id) DO UPDATE SET encrypted_token=EXCLUDED.encrypted_token,updated_at=now()",
    [
      encrypt({
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: Date.now() + token.expires_in * 1000,
      }),
    ],
  );
}
async function accessToken() {
  const row = (await pool.query("SELECT encrypted_token FROM google_tokens WHERE id=1")).rows[0];
  if (!row) throw new HttpError(409, "Aucun compte Google connecté.");
  const token = decrypt<Tokens>(row.encrypted_token);
  if (token.expires_at > Date.now() + 60000) return token.access_token;
  if (!token.refresh_token) throw new HttpError(409, "Reconnectez le compte Google.");
  const next = await jsonFetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      refresh_token: token.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  await pool.query("UPDATE google_tokens SET encrypted_token=$1,updated_at=now() WHERE id=1", [
    encrypt({
      ...token,
      access_token: next.access_token,
      expires_at: Date.now() + next.expires_in * 1000,
    }),
  ]);
  return next.access_token as string;
}
async function google(url: string, body?: unknown) {
  const token = await accessToken();
  return jsonFetch(url, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
  });
}
export async function properties() {
  const results = await Promise.allSettled([
    google("https://www.googleapis.com/webmasters/v3/sites"),
    (async () => {
      const accounts: any[] = [];
      let page = "";
      do {
        const result = await google(
          "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200" +
            (page ? `&pageToken=${encodeURIComponent(page)}` : ""),
        );
        accounts.push(...(result.accountSummaries ?? []));
        page = result.nextPageToken ?? "";
      } while (page);
      return accounts;
    })(),
  ]);
  return {
    gsc: results[0].status === "fulfilled" ? (results[0].value.siteEntry ?? []) : [],
    ga4:
      results[1].status === "fulfilled"
        ? results[1].value.flatMap((a: any) => a.propertySummaries ?? [])
        : [],
    errors: results.flatMap((r, i) =>
      r.status === "rejected"
        ? [`${i === 0 ? "Search Console" : "GA4"} : ${r.reason.message}`]
        : [],
    ),
  };
}
export const hostRegex = (host: string) =>
  `^https?://(www\\.)?${host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(/|$)`;
export async function syncGoogle(
  siteId: string,
  provider: "gsc" | "ga4",
  startDate: string,
  endDate: string,
) {
  const site = SITES.find((s) => s.id === siteId);
  if (!site) throw new HttpError(400, "Site inconnu");
  const connection = (await pool.query("SELECT * FROM integrations WHERE site_id=$1", [siteId]))
    .rows[0];
  const property = provider === "gsc" ? connection.gsc_property : connection.ga4_property;
  if (!property)
    throw new HttpError(409, "Sélectionnez la propriété de ce site avant la synchronisation.");
  const runId = crypto.randomUUID();
  try {
    await pool.query(
      "INSERT INTO sync_runs(id,site_id,provider,status,start_date,end_date) VALUES($1,$2,$3,$4,$5,$6)",
      [runId, siteId, provider, "running", startDate, endDate],
    );
  } catch (error: any) {
    if (error.code === "23505")
      throw new HttpError(409, "Une synchronisation est déjà en cours pour cette source.");
    throw error;
  }
  try {
    let count = 0,
      notes = "";
    if (provider === "gsc") {
      const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`;
      const base = {
        startDate,
        endDate,
        type: "web",
        dataState: "final",
        dimensionFilterGroups: [
          {
            groupType: "and",
            filters: [
              { dimension: "page", operator: "includingRegex", expression: hostRegex(site.host) },
            ],
          },
        ],
      };
      const daily = await google(url, { ...base, dimensions: ["date"], rowLimit: 25000 });
      const details: any[] = [];
      let truncated = false;
      for (let startRow = 0; startRow < 100000; startRow += 25000) {
        const part = await google(url, {
          ...base,
          dimensions: ["query", "page"],
          rowLimit: 25000,
          startRow,
        });
        details.push(...(part.rows ?? []));
        if ((part.rows?.length ?? 0) < 25000) break;
        if (startRow === 75000) truncated = true;
      }
      notes =
        "Données finales Google, recherche web, filtrées sur ce domaine. Requêtes limitées aux lignes retournées par Google (requêtes anonymisées exclues)." +
        (truncated ? " Limite de 100 000 lignes atteinte." : "");
      await transaction(async (client) => {
        await client.query("SELECT revision FROM workspace_revision WHERE id=1 FOR UPDATE");
        await client.query("DELETE FROM search_daily WHERE site_id=$1 AND day BETWEEN $2 AND $3", [
          siteId,
          startDate,
          endDate,
        ]);
        for (const row of daily.rows ?? [])
          await client.query(
            "INSERT INTO search_daily(site_id,day,clicks,impressions,position,source_property) VALUES($1,$2,$3,$4,$5,$6)",
            [siteId, row.keys[0], row.clicks, row.impressions, row.position, property],
          );
        for (const row of details) {
          const term = row.keys[0],
            page = row.keys[1],
            id = `gsc-${recordId(siteId + "|" + term + "|" + page)}`;
          const existing = (
            await client.query(
              "SELECT payload FROM records WHERE collection='keywords' AND id=$1",
              [id],
            )
          ).rows[0]?.payload;
          const measurement = {
            startDate,
            endDate,
            id: `gsc-${startDate}-${endDate}`,
            date: endDate,
            position: row.position,
            impressions: row.impressions,
            clicks: row.clicks,
            source: "Google Search Console",
            notes: `Période ${startDate} → ${endDate} · ${property} · ${page}`,
          };
          const measurements = [
            ...(existing?.measurements ?? []).filter((m: any) => m.id !== measurement.id),
            measurement,
          ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
          const latest = measurements.at(-1)!;
          const duration = (m: any) => Date.parse(m.endDate) - Date.parse(m.startDate);
          const previous = [...measurements]
            .reverse()
            .find(
              (m) => m.endDate && m.endDate < latest.startDate && duration(m) === duration(latest),
            );
          const payload = {
            ...existing,
            id,
            siteId,
            term,
            family: existing?.family ?? "Requêtes Search Console",
            intent: existing?.intent ?? "Informationnelle",
            position: latest.position,
            previous: previous?.position ?? null,
            volume: null,
            difficulty: null,
            url: page,
            history: [],
            competitors: [],
            lastCheck: latest.date,
            notes:
              existing?.notes ??
              "Requête mesurée par Google Search Console ; position moyenne sur la période indiquée.",
            measurements,
          };
          await client.query(
            "INSERT INTO records(collection,id,site_id,payload,origin,source_url,observed_at) VALUES('keywords',$1,$2,$3,'gsc',$4,now()) ON CONFLICT(collection,id) DO UPDATE SET payload=EXCLUDED.payload,observed_at=now(),updated_at=now()",
            [id, siteId, JSON.stringify(payload), property],
          );
        }
        await client.query(
          "INSERT INTO families(name) VALUES('Requêtes Search Console') ON CONFLICT DO NOTHING",
        );
        await client.query("UPDATE integrations SET gsc_synced_at=now() WHERE site_id=$1", [
          siteId,
        ]);
        await client.query("UPDATE workspace_revision SET revision=revision+1 WHERE id=1");
      });
      count = details.length;
    } else {
      const rows: any[] = [];
      let meta: any = {};
      for (let offset = 0; offset < 100000; offset += 10000) {
        const result = await google(
          `https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`,
          {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: "date" }, { name: "sessionSource" }, { name: "sessionMedium" }],
            metrics: [{ name: "sessions" }, { name: "engagedSessions" }, { name: "keyEvents" }],
            dimensionFilter: {
              filter: {
                fieldName: "hostName",
                stringFilter: {
                  matchType: "FULL_REGEXP",
                  value: `(www\\.)?${site.host.replace(/\./g, "\\.")}`,
                  caseSensitive: false,
                },
              },
            },
            limit: "10000",
            offset: String(offset),
          },
        );
        rows.push(...(result.rows ?? []));
        meta = result.metadata ?? {};
        if (rows.length >= (result.rowCount ?? 0)) break;
        if (offset === 90000)
          throw new HttpError(422, "Rapport GA4 trop volumineux. Réduisez la période.");
      }
      notes =
        "Sessions et événements clés GA4 filtrés par hostname. Les événements clés ne sont pas des fiches de leads." +
        (meta.subjectToThresholding ? " Seuil de confidentialité appliqué par Google." : "") +
        (meta.dataLossFromOtherRow ? " Certaines lignes sont regroupées dans (other)." : "");
      await transaction(async (client) => {
        await client.query(
          "DELETE FROM analytics_daily WHERE site_id=$1 AND day BETWEEN $2 AND $3",
          [siteId, startDate, endDate],
        );
        for (const row of rows) {
          const [date, source, medium] = row.dimensionValues.map((d: any) => d.value);
          const [sessions, engaged, keyEvents] = row.metricValues.map((m: any) => Number(m.value));
          await client.query(
            "INSERT INTO analytics_daily(site_id,day,source,medium,sessions,engaged_sessions,key_events,source_property) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
            [
              siteId,
              `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
              source,
              medium,
              sessions,
              engaged,
              keyEvents,
              property,
            ],
          );
        }
        await client.query("UPDATE integrations SET ga4_synced_at=now() WHERE site_id=$1", [
          siteId,
        ]);
      });
      count = rows.length;
    }
    await pool.query(
      "UPDATE sync_runs SET status='success',finished_at=now(),row_count=$2,message=$3 WHERE id=$1",
      [runId, count, notes],
    );
    return { runId, count, message: notes };
  } catch (error: any) {
    await pool.query(
      "UPDATE sync_runs SET status='error',finished_at=now(),message=$2 WHERE id=$1",
      [
        runId,
        error instanceof HttpError
          ? error.message
          : "Synchronisation interrompue ; les données précédentes sont conservées.",
      ],
    );
    throw error;
  }
}
