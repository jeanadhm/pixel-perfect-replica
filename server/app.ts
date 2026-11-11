import express, { type RequestHandler } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { pool, transaction } from "./db";
import { config } from "./config";
import { passwordHash, verifyPassword, hashToken, HttpError } from "./security";
import { getWorkspace, saveCollection } from "./repository";
import {
  authorizationUrl,
  finishAuthorization,
  googleConfigured,
  properties,
  syncGoogle,
} from "./google";
import { importLeads } from "./imports";
import { SITES } from "../src/lib/demo/sites";
import { crawlPage } from "./crawl";
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; name: string; email: string; role: "admin" | "editor" | "viewer" };
    }
  }
}
const credentials = z.object({
  email: z
    .string()
    .email()
    .max(200)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(12).max(200),
});
const newUser = credentials.extend({
  name: z.string().trim().min(2).max(100),
  role: z.enum(["admin", "editor", "viewer"]).default("editor"),
});
const sessionCookie = "ambs_session";
const cookieOptions = {
  httpOnly: true,
  secure: config.production,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 7 * 86400000,
};
const signedIn: RequestHandler = (req, res, next) =>
  req.user ? next() : res.status(401).json({ error: "Connectez-vous pour accéder à cet espace." });
const editor: RequestHandler = (req, res, next) =>
  req.user?.role !== "viewer"
    ? next()
    : res.status(403).json({ error: "Compte en lecture seule." });
const admin: RequestHandler = (req, res, next) =>
  req.user?.role === "admin"
    ? next()
    : res.status(403).json({ error: "Accès administrateur requis." });
export function createApp() {
  const allowedOrigins = new Set([config.appOrigin]);
  if (!config.production) {
    const origin = new URL(config.appOrigin);
    if (["localhost", "127.0.0.1"].includes(origin.hostname)) {
      origin.hostname = origin.hostname === "localhost" ? "127.0.0.1" : "localhost";
      allowedOrigins.add(origin.origin);
    }
  }
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "8mb" }));
  app.use(cookieParser());
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      !allowedOrigins.has(String(req.headers.origin))
    )
      return void res.status(403).json({ error: "Origine de la requête refusée." });
    next();
  });
  app.get("/api/health", async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({ ok: true, database: "postgresql" });
  });
  app.use("/api", async (req, _res, next) => {
    const token = req.cookies[sessionCookie];
    if (typeof token === "string" && token.length < 200) {
      const row = (
        await pool.query(
          "SELECT u.id,u.email,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()",
          [hashToken(token)],
        )
      ).rows[0];
      if (row) req.user = row;
    }
    next();
  });
  async function issueSession(userId: string, res: express.Response) {
    const token = randomBytes(32).toString("base64url");
    await pool.query(
      "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",
      [hashToken(token), userId],
    );
    res.cookie(sessionCookie, token, cookieOptions);
  }
  app.get("/api/auth/session", async (req, res) => {
    const count = (await pool.query("SELECT count(*) FROM users")).rows[0].count;
    res.json({
      user: req.user ?? null,
      setupRequired: Number(count) === 0,
      production: config.production,
    });
  });
  const limit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Trop de tentatives. Réessayez dans quelques minutes." },
  });
  app.post("/api/auth/setup", limit, async (req, res) => {
    if (
      config.production &&
      (!process.env["SETUP_TOKEN"] ||
        hashToken(String(req.body.setupToken ?? "")) !== hashToken(process.env["SETUP_TOKEN"]))
    )
      throw new HttpError(403, "Jeton de configuration initiale requis.");
    const data = newUser.parse(req.body),
      id = randomUUID();
    await transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(724117)");
      if (Number((await client.query("SELECT count(*) FROM users")).rows[0].count) > 0)
        throw new HttpError(409, "Le compte initial existe déjà.");
      await client.query(
        "INSERT INTO users(id,email,name,password_hash,role) VALUES($1,$2,$3,$4,'admin')",
        [id, data.email, data.name, passwordHash(data.password)],
      );
    });
    await issueSession(id, res);
    res.status(201).json({ ok: true });
  });
  app.post("/api/auth/login", limit, async (req, res) => {
    const data = credentials.parse(req.body);
    const user = (await pool.query("SELECT * FROM users WHERE email=$1", [data.email])).rows[0];
    const valid = verifyPassword(
      data.password,
      user?.password_hash ?? passwordHash("invalid-dummy-password"),
    );
    if (!user || !valid) throw new HttpError(401, "Adresse ou mot de passe incorrect.");
    await issueSession(user.id, res);
    res.json({ ok: true });
  });
  app.post("/api/auth/logout", signedIn, async (req, res) => {
    await pool.query("DELETE FROM sessions WHERE token_hash=$1", [
      hashToken(req.cookies[sessionCookie]),
    ]);
    res.clearCookie(sessionCookie, { ...cookieOptions, maxAge: undefined });
    res.json({ ok: true });
  });
  app.use("/api", signedIn);
  app.get("/api/users", async (_req, res) =>
    res.json({
      users: (await pool.query("SELECT id,name,email,role FROM users ORDER BY name")).rows,
    }),
  );
  app.post("/api/users", admin, async (req, res) => {
    const data = newUser.parse(req.body);
    await pool.query("INSERT INTO users(id,email,name,password_hash,role) VALUES($1,$2,$3,$4,$5)", [
      randomUUID(),
      data.email,
      data.name,
      passwordHash(data.password),
      data.role,
    ]);
    res.status(201).json({ ok: true });
  });
  app.get("/api/workspace", async (_req, res) =>
    res.json(
      await transaction(async (client) => {
        await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
        return getWorkspace(client);
      }),
    ),
  );
  app.put("/api/workspace/:collection", editor, async (req, res) => {
    const body = z
      .object({ revision: z.number().int().nonnegative(), items: z.array(z.unknown()) })
      .parse(req.body);
    const revision = await saveCollection(
      String(req.params["collection"]),
      body.items,
      body.revision,
      req.user!.id,
    );
    res.json({ revision });
  });
  app.get("/api/public-pages", async (_req, res) =>
    res.json({
      pages: (
        await pool.query("SELECT payload,observed_at FROM public_observations ORDER BY site_id,url")
      ).rows.map((r) => ({ ...r.payload, checkedAt: r.observed_at })),
    }),
  );
  app.post("/api/crawl", editor, async (req, res) => {
    const { url } = z.object({ url: z.string().url() }).parse(req.body);
    res.json(await crawlPage(url, req.user!.id));
  });
  app.get("/api/integrations", async (_req, res) =>
    res.json({
      googleConfigured: googleConfigured(),
      googleConnected: !!(await pool.query("SELECT id FROM google_tokens")).rowCount,
      sites: (await pool.query("SELECT * FROM integrations ORDER BY site_id")).rows,
      runs: (await pool.query("SELECT * FROM sync_runs ORDER BY started_at DESC LIMIT 30")).rows,
    }),
  );
  app.put("/api/integrations/:siteId", admin, async (req, res) => {
    const id = String(req.params["siteId"]),
      site = SITES.find((s) => s.id === id);
    if (!site) throw new HttpError(400, "Site inconnu");
    const data = z
      .object({
        gscProperty: z.string().max(500).nullable(),
        ga4Property: z.string().regex(/^\d+$/).nullable(),
      })
      .parse(req.body);
    if (data.gscProperty) {
      const property = data.gscProperty;
      if (property.startsWith("sc-domain:")) {
        const domain = property.slice(10);
        if (site.host !== domain && !site.host.endsWith("." + domain))
          throw new HttpError(400, "La propriété Search Console ne couvre pas ce site.");
      } else {
        let url: URL;
        try {
          url = new URL(property);
        } catch {
          throw new HttpError(400, "Propriété Search Console invalide.");
        }
        if (
          !["https:", "http:"].includes(url.protocol) ||
          url.hostname.replace(/^www\./, "") !== site.host
        )
          throw new HttpError(400, "La propriété Search Console doit correspondre à ce site.");
      }
    }
    const before = (await pool.query("SELECT * FROM integrations WHERE site_id=$1", [id])).rows[0];
    if (
      (before.gsc_property && before.gsc_property !== data.gscProperty) ||
      (before.ga4_property && before.ga4_property !== data.ga4Property)
    )
      throw new HttpError(
        409,
        "Une propriété est déjà liée. Sa modification nécessite une migration des relevés existants.",
      );
    await pool.query(
      "UPDATE integrations SET gsc_property=$2,ga4_property=$3,updated_at=now() WHERE site_id=$1",
      [id, data.gscProperty, data.ga4Property],
    );
    res.json({ ok: true });
  });
  app.get("/api/google/start", admin, async (req, res) =>
    res.json({ url: await authorizationUrl(req.user!.id) }),
  );
  app.get("/api/google/callback", admin, async (req, res) => {
    const data = z.object({ state: z.string(), code: z.string() }).parse(req.query);
    await finishAuthorization(data.state, data.code, req.user!.id);
    res.redirect(config.appOrigin + "/connexions?connected=google");
  });
  app.get("/api/google/properties", admin, async (_req, res) => res.json(await properties()));
  app.post("/api/sync/:provider/:siteId", editor, async (req, res) => {
    const data = z
      .object({
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(req.body);
    const start = Date.parse(data.startDate),
      end = Date.parse(data.endDate);
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start > end ||
      end - start > 93 * 86400000 ||
      end > Date.now()
    )
      throw new HttpError(400, "Choisissez une période passée de 93 jours maximum.");
    const provider = z.enum(["gsc", "ga4"]).parse(req.params["provider"]);
    res.json(
      await syncGoogle(String(req.params["siteId"]), provider, data.startDate, data.endDate),
    );
  });
  app.post("/api/import/leads", editor, async (req, res) => {
    const data = z
      .object({
        siteId: z.string(),
        system: z.string().trim().min(2).max(100),
        csv: z.string().min(1).max(5000000),
      })
      .parse(req.body);
    res.json({ count: await importLeads(data.siteId, data.system, data.csv, req.user!.id) });
  });
  app.get("/api/metrics", async (req, res) => {
    const days = z.coerce
        .number()
        .int()
        .min(1)
        .max(365)
        .parse(req.query["days"] ?? 30),
      siteId = String(req.query["site"] ?? "all");
    if (siteId !== "all" && !SITES.some((s) => s.id === siteId))
      throw new HttpError(400, "Site inconnu");
    const end = new Date();
    end.setUTCDate(end.getUTCDate() - 1);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - days + 1);
    const startDate = start.toISOString().slice(0, 10),
      endDate = end.toISOString().slice(0, 10);
    const [search, analytics, runs] = await Promise.all([
      pool.query(
        "SELECT site_id,day::text,clicks::float8,impressions::float8,position::float8,source_property,fetched_at FROM search_daily WHERE day BETWEEN $1 AND $2 AND ($3='all' OR site_id=$3) ORDER BY day",
        [startDate, endDate, siteId],
      ),
      pool.query(
        "SELECT site_id,day::text,source,medium,sessions::float8,engaged_sessions::float8,key_events::float8,source_property,fetched_at FROM analytics_daily WHERE day BETWEEN $1 AND $2 AND ($3='all' OR site_id=$3) ORDER BY day",
        [startDate, endDate, siteId],
      ),
      pool.query(
        "SELECT site_id,provider,start_date::text,end_date::text,finished_at,message FROM sync_runs WHERE status='success' AND start_date<=$2 AND end_date>=$1 AND ($3='all' OR site_id=$3) ORDER BY finished_at DESC",
        [startDate, endDate, siteId],
      ),
    ]);
    res.json({
      startDate,
      endDate,
      siteIds: SITES.filter((s) => siteId === "all" || s.id === siteId).map((s) => s.id),
      search: search.rows,
      analytics: analytics.rows,
      runs: runs.rows,
    });
  });
  app.use("/api", (_req, res) => res.status(404).json({ error: "Route API introuvable" }));
  const errors: express.ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof z.ZodError)
      return void res.status(400).json({
        error: error.issues
          .map((i) => i.path.join(".") + ": " + i.message)
          .slice(0, 4)
          .join("; "),
      });
    if (error instanceof HttpError)
      return void res.status(error.status).json({ error: error.message });
    if (error?.code === "23505")
      return void res.status(409).json({ error: "Cette donnée existe déjà." });
    console.error("API error", error instanceof Error ? error.name : "Unknown");
    res.status(500).json({
      error: "Le serveur n’a pas pu traiter cette opération. Aucune réussite n’est confirmée.",
    });
  };
  app.use(errors);
  return app;
}
