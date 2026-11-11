import { beforeAll, afterAll, afterEach, describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "./app";
import { pool } from "./db";
import { migrate } from "./migrate";
import { seed } from "./seed";
import { encrypt } from "./security";
import { allowedPublicUrl } from "./crawl";
import { parseLeads } from "./imports";
import { validateRealData } from "./repository";
const origin = "http://localhost:3000",
  app = createApp(),
  admin = request.agent(app);
const account = {
  email: "admin@tests.invalid",
  name: "Responsable Test",
  password: "test-only-password-7359",
};
beforeAll(async () => {
  if (!process.env["DATABASE_URL"]?.includes("/ambs_hub_test?"))
    throw new Error("Tests autorisés uniquement dans ambs_hub_test.");
  await migrate();
  await pool.query(
    "TRUNCATE users,sites,records,families,change_log,google_tokens,oauth_states,integrations,sync_runs,search_daily,analytics_daily,public_observations CASCADE",
  );
  await pool.query(
    "CREATE TABLE IF NOT EXISTS seed_versions(version text PRIMARY KEY,applied_at timestamptz DEFAULT now())",
  );
  await pool.query("DELETE FROM seed_versions");
  await seed();
  await admin.post("/api/auth/setup").set("Origin", origin).send(account).expect(201);
});
afterEach(() => vi.restoreAllMocks());
afterAll(() => pool.end());
describe("Authentication and access control", () => {
  it("requires a session for business data and prevents a second setup", async () => {
    await request(app).get("/api/workspace").expect(401);
    await request(app).post("/api/auth/setup").set("Origin", origin).send(account).expect(409);
  });
  it("rejects cross-origin mutations and never exposes password hashes", async () => {
    await admin.post("/api/users").set("Origin", "https://attacker.invalid").send({}).expect(403);
    const response = await admin.get("/api/users").expect(200);
    expect(response.text).not.toContain("password");
    expect(response.body.users[0].name).toBe(account.name);
  });
  it("lets a viewer read but not modify shared data", async () => {
    const user = {
      email: "viewer@tests.invalid",
      name: "Lecteur Test",
      password: "test-only-password-8359",
      role: "viewer",
    };
    await admin.post("/api/users").set("Origin", origin).send(user).expect(201);
    const viewer = request.agent(app);
    await viewer.post("/api/auth/login").set("Origin", origin).send(user).expect(200);
    const snapshot = await viewer.get("/api/workspace").expect(200);
    await viewer
      .put("/api/workspace/actions")
      .set("Origin", origin)
      .send({ revision: snapshot.body.revision, items: [] })
      .expect(403);
    await viewer.get("/api/google/start").expect(403);
  });
});
describe("Evidence-bound workspace", () => {
  it("starts with zero invented traffic, leads or GEO answers and no fictitious owners", async () => {
    const { body } = await admin.get("/api/workspace").expect(200);
    expect(body.state.leads).toHaveLength(0);
    expect(body.state.geoTests).toHaveLength(0);
    expect(body.state.prompts).toHaveLength(24);
    expect(body.state.keywords.every((k: any) => k.position === null && k.volume === null)).toBe(
      true,
    );
    expect(body.state.actions.every((a: any) => a.owner === "À attribuer")).toBe(true);
    expect(body.state.pages).toHaveLength(133);
    const metrics = await admin.get("/api/metrics").expect(200);
    expect(metrics.body.search).toHaveLength(0);
    expect(metrics.body.analytics).toHaveLength(0);
    expect(metrics.body.runs).toHaveLength(0);
  });
  it("persists an action across authenticated sessions and rejects stale overwrites", async () => {
    const snapshot = (await admin.get("/api/workspace")).body;
    const action = {
      ...snapshot.state.actions[0],
      title: "Action de test persistante",
      owner: account.name,
    };
    const items = snapshot.state.actions.map((a: any) => (a.id === action.id ? action : a));
    await admin
      .put("/api/workspace/actions")
      .set("Origin", origin)
      .send({ revision: snapshot.revision, items })
      .expect(200);
    await admin
      .put("/api/workspace/actions")
      .set("Origin", origin)
      .send({ revision: snapshot.revision, items: [] })
      .expect(409);
    const second = request.agent(app);
    await second.post("/api/auth/login").set("Origin", origin).send(account).expect(200);
    const loaded = (await second.get("/api/workspace")).body;
    expect(loaded.state.actions.find((a: any) => a.id === action.id).title).toBe(action.title);
  });
  it("rejects made-up assignees and prompt copies presented as observations", async () => {
    const { state, revision } = (await admin.get("/api/workspace")).body;
    await admin
      .put("/api/workspace/actions")
      .set("Origin", origin)
      .send({
        revision,
        items: state.actions.map((a: any, i: number) =>
          i === 0 ? { ...a, owner: "Personne inventée" } : a,
        ),
      })
      .expect(400);
    const prompt = state.prompts[0];
    const test = {
      id: "bad-geo",
      siteId: prompt.siteId,
      promptId: prompt.id,
      date: "2026-11-01T12:00:00Z",
      platform: prompt.platform,
      question: prompt.question,
      response: prompt.question,
      mentioned: false,
      recommended: false,
      accuracy: "—",
      mentionPosition: null,
      competitors: [],
      sources: [],
      status: "Non mentionnée",
      origin: "Saisie manuelle",
      evidenceUrl: "https://example.com/proof",
    };
    await admin
      .put("/api/workspace/geoTests")
      .set("Origin", origin)
      .send({ revision, items: [test] })
      .expect(400);
    await admin
      .put("/api/workspace/geoTests")
      .set("Origin", origin)
      .send({
        revision,
        items: [
          {
            ...test,
            origin: "Simulation",
            response: "Une réponse générée fictivement ne doit pas entrer dans ce suivi.",
          },
        ],
      })
      .expect(400);
  });
  it("stores a complete observed GEO response with a proof and no invented leads", async () => {
    const { state, revision } = (await admin.get("/api/workspace")).body;
    const p = state.prompts[0];
    const test = {
      id: "real-geo-test-fixture",
      siteId: p.siteId,
      promptId: p.id,
      date: "2026-11-01T12:00:00Z",
      platform: p.platform,
      question: p.question,
      response:
        "Réponse observée dans une fixture de test automatisé ; elle est distincte du prompt et conserve une preuve.",
      mentioned: false,
      recommended: false,
      accuracy: "—",
      mentionPosition: null,
      competitors: [],
      sources: [],
      status: "Non mentionnée",
      origin: "Saisie manuelle",
      evidenceUrl: "https://example.com/test-proof",
    };
    await admin
      .put("/api/workspace/geoTests")
      .set("Origin", origin)
      .send({ revision, items: [test] })
      .expect(200);
    const saved = (await admin.get("/api/workspace")).body.state;
    expect(saved.geoTests[0].evidenceUrl).toBe(test.evidenceUrl);
    expect(saved.leads).toHaveLength(0);
  });
});
describe("Real-source imports and integrations", () => {
  it("blocks unsupported crawl URLs and private application routes", () => {
    for (const url of [
      "http://ambs-agency.com",
      "https://127.0.0.1",
      "https://ambs-agency.com@localhost",
      "https://factory.dialagent.fr/login",
      "https://ambs-agency.com:4000/",
    ])
      expect(() => allowedPublicUrl(url)).toThrow();
    expect(allowedPublicUrl("https://leads.ambs-agency.com/docs").site.id).toBe("leads");
  });
  it("requires traceable leads and justification for GEO attribution", () => {
    expect(() => parseLeads("company,date\nTest,2026-11-01")).toThrow();
    expect(() =>
      parseLeads(
        "externalId,company,date,source,channel,url\n1,Test,2026-11-01,GEO,ChatGPT,https://example.com/lead/1",
      ),
    ).toThrow(/justifiez/);
    const lead = {
      id: "manual",
      sourceSystem: "Formulaire",
      sourceRecordId: "123",
      date: "2026-11-01",
      evidenceUrl: "https://example.com/123",
      source: "GEO",
    };
    expect(() => validateRealData("leads", [lead], [])).toThrow(/attribution/);
    expect(() =>
      validateRealData("leads", [{ ...lead, source: "Direct", date: "2026-02-31" }], []),
    ).toThrow(/date/);
    expect(() =>
      validateRealData(
        "leads",
        [{ ...lead, source: "Direct", evidenceUrl: "javascript:alert(1)" }],
        [],
      ),
    ).toThrow(/HTTPS/);
  });
  it("imports a source-identified lead idempotently without inflating lead count", async () => {
    const csv =
      "externalId,company,date,source,channel,url,value,status,attributionEvidence\ncrm-1,Entreprise Test,2026-11-01,GEO,ChatGPT,https://example.com/crm/1,1000,Qualifié,UTM conservée dans la fiche";
    const body = { siteId: "leads", system: "CRM test", csv };
    await admin.post("/api/import/leads").set("Origin", origin).send(body).expect(200);
    const existing = (await admin.get("/api/workspace")).body;
    await admin
      .put("/api/workspace/leads")
      .set("Origin", origin)
      .send({
        revision: existing.revision,
        items: existing.state.leads.map((lead: any) => ({ ...lead, owner: account.name })),
      })
      .expect(200);
    await admin.post("/api/import/leads").set("Origin", origin).send(body).expect(200);
    const state = (await admin.get("/api/workspace")).body.state;
    expect(state.leads).toHaveLength(1);
    expect(state.leads[0].sourceRecordId).toBe("crm-1");
    expect(state.leads[0].evidenceUrl).toBe("https://example.com/crm/1");
    expect(state.leads[0].owner).toBe(account.name);
  });
  it("refuses a Search Console property for another site", async () => {
    await admin
      .put("/api/integrations/leads")
      .set("Origin", origin)
      .send({ gscProperty: "sc-domain:example.com", ga4Property: null })
      .expect(400);
  });
  it("synchronizes Search Console using host filters, reported daily totals and idempotent rows", async () => {
    await pool.query(
      "INSERT INTO google_tokens(id,encrypted_token) VALUES(1,$1) ON CONFLICT(id) DO UPDATE SET encrypted_token=EXCLUDED.encrypted_token",
      [encrypt({ access_token: "mock-token-not-a-secret", expires_at: Date.now() + 3600000 })],
    );
    await admin
      .put("/api/integrations/leads")
      .set("Origin", origin)
      .send({ gscProperty: "sc-domain:ambs-agency.com", ga4Property: "12345" })
      .expect(200);
    const calls: any[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, options) => {
      const body = JSON.parse(String(options?.body));
      calls.push(body);
      return new Response(
        JSON.stringify(
          body.dimensions.length === 1
            ? { rows: [{ keys: [body.startDate], clicks: 60, impressions: 500, position: 4.5 }] }
            : {
                rows: [
                  {
                    keys: ["lead management", "https://leads.ambs-agency.com/"],
                    clicks: 40,
                    impressions: 300,
                    position: 5.5,
                  },
                ],
              },
        ),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    for (let i = 0; i < 2; i++)
      await admin
        .post("/api/sync/gsc/leads")
        .set("Origin", origin)
        .send({ startDate: "2026-11-01", endDate: "2026-11-04" })
        .expect(200);
    expect(
      calls.every((c) =>
        c.dimensionFilterGroups[0].filters[0].expression.includes("leads\\.ambs-agency\\.com"),
      ),
    ).toBe(true);
    const rows = (await pool.query("SELECT * FROM search_daily WHERE site_id='leads'")).rows;
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].impressions)).toBe(500);
    const data = (await admin.get("/api/workspace")).body;
    const imported = data.state.keywords.filter((k: any) => k.id.startsWith("gsc-"));
    expect(imported).toHaveLength(1);
    expect(imported[0].measurements).toHaveLength(1);
    expect(imported[0].position).toBe(5.5);
    expect(imported[0].previous).toBeNull();
    await admin
      .put("/api/workspace/keywords")
      .set("Origin", origin)
      .send({
        revision: data.revision,
        items: data.state.keywords.map((k: any) =>
          k.id === imported[0].id ? { ...k, term: "Une autre requête" } : k,
        ),
      })
      .expect(400);
    await admin
      .put("/api/workspace/keywords")
      .set("Origin", origin)
      .send({
        revision: data.revision,
        items: data.state.keywords.map((k: any) =>
          k.id === imported[0].id ? { ...k, position: 1 } : k,
        ),
      })
      .expect(400);
  });
  it("keeps the latest keyword measurement when older history is imported afterwards", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, options) => {
      const body = JSON.parse(String(options?.body));
      return new Response(
        JSON.stringify({
          rows:
            body.dimensions.length === 1
              ? [{ keys: ["2026-10-01"], clicks: 2, impressions: 20, position: 12 }]
              : [
                  {
                    keys: ["lead management", "https://leads.ambs-agency.com/"],
                    clicks: 2,
                    impressions: 20,
                    position: 12,
                  },
                ],
        }),
        { status: 200 },
      );
    });
    await admin
      .post("/api/sync/gsc/leads")
      .set("Origin", origin)
      .send({ startDate: "2026-10-01", endDate: "2026-10-04" })
      .expect(200);
    const data = (await admin.get("/api/workspace")).body;
    const keyword = data.state.keywords.find((k: any) => k.id.startsWith("gsc-"));
    expect(keyword.lastCheck).toBe("2026-11-04");
    expect(keyword.position).toBe(5.5);
    expect(keyword.previous).toBe(12);
    expect(keyword.measurements).toHaveLength(2);
  });
  it("stores GA4 events as analytics, never as new lead records", async () => {
    const before = Number(
      (await pool.query("SELECT count(*) FROM records WHERE collection='leads'")).rows[0].count,
    );
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          rowCount: 1,
          rows: [
            {
              dimensionValues: [
                { value: "20261102" },
                { value: "chatgpt.com" },
                { value: "referral" },
              ],
              metricValues: [{ value: "10" }, { value: "5" }, { value: "3" }],
            },
          ],
          metadata: { subjectToThresholding: true },
        }),
        { status: 200 },
      ),
    );
    await admin
      .post("/api/sync/ga4/leads")
      .set("Origin", origin)
      .send({ startDate: "2026-11-01", endDate: "2026-11-04" })
      .expect(200);
    expect(
      Number(
        (await pool.query("SELECT count(*) FROM records WHERE collection='leads'")).rows[0].count,
      ),
    ).toBe(before);
    const ga = (await pool.query("SELECT * FROM analytics_daily")).rows;
    expect(Number(ga[0].sessions)).toBe(10);
    expect(Number(ga[0].key_events)).toBe(3);
  });
  it("rejects callbacks without a valid single-use OAuth state", async () => {
    await admin.get("/api/google/callback?state=invalid&code=invalid").expect(400);
  });
});
