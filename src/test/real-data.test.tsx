import { describe, it, expect } from "vitest";
import { summarize, coverage } from "@/lib/api/metrics";
import { serializeCsv, createReportPdf } from "@/lib/demo/export";
import { scopeState, emptyState } from "@/lib/demo/scope";
import { nextDueDate } from "@/lib/demo/workflow";
import { NAV } from "@/components/layout/nav";
import fs from "node:fs";
import path from "node:path";
describe("Real data semantics", () => {
  it("counts partial coverage per site and day without double-counting repeated syncs", () => {
    const run = {
      site_id: "ambs",
      provider: "gsc",
      start_date: "2026-11-01",
      end_date: "2026-11-05",
      finished_at: "2026-11-11",
      message: "",
    };
    const result = coverage(
      {
        siteIds: ["ambs", "leads"],
        startDate: "2026-11-01",
        endDate: "2026-11-10",
        search: [],
        analytics: [],
        runs: [run, run],
      },
      "gsc",
    );
    expect(result).toMatchObject({ covered: 5, total: 20, complete: false });
  });
  it("leaves unconnected metrics unknown instead of zero or demo totals", () => {
    const result = summarize({
      startDate: "2026-11-01",
      endDate: "2026-11-10",
      search: [],
      analytics: [],
      runs: [],
    });
    expect(result.impressions).toBeNull();
    expect(result.sessions).toBeNull();
    expect(result.aiSessions).toBeNull();
  });
  it("distinguishes an observed zero from an absent source", () => {
    const result = summarize({
      startDate: "2026-11-01",
      endDate: "2026-11-10",
      search: [],
      analytics: [],
      runs: [
        {
          site_id: "ambs",
          provider: "gsc",
          start_date: "2026-11-01",
          end_date: "2026-11-10",
          finished_at: "2026-11-11",
          message: "",
        },
      ],
    });
    expect(result.impressions).toBe(0);
    expect(result.sessions).toBeNull();
  });
  it("scopes pages and audits together without modifying the original workspace", () => {
    const state = emptyState();
    state.audits = [
      {
        id: "a",
        pageId: "unknown",
        checkId: "title",
        status: "À vérifier",
        notes: "",
        evidenceUrl: "",
        checkedAt: "",
      },
    ];
    expect(scopeState(state, "leads").audits).toHaveLength(0);
    expect(state.audits).toHaveLength(1);
  });
  it("maps every navigation entry to a real Next.js route", () => {
    for (const group of NAV)
      for (const item of group.items)
        expect(
          fs.existsSync(
            path.join(
              process.cwd(),
              "src/app/(dashboard)",
              item.url === "/" ? "" : item.url.slice(1),
              "page.tsx",
            ),
          ),
        ).toBe(true);
  });
  it("preserves CSV escaping and prevents formula execution", () => {
    const csv = serializeCsv([{ name: '=HYPERLINK("x")', note: 'Une "preuve"\nDeux lignes' }]);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('""preuve""');
  });
  it("handles monthly action recurrence at month ends", () => {
    expect(nextDueDate("2026-01-31", "Mensuelle")).toBe("2026-02-28");
  });
  it("exports a sourced PDF without any demo headline", async () => {
    const doc = await createReportPdf(
      "AMBS",
      [{ heading: "Données vérifiées", lines: ["Search Console : non connecté"] }],
      "SUIVI DOCUMENTÉ",
    );
    expect(doc.output().startsWith("%PDF-")).toBe(true);
    expect(doc.output()).not.toContain("DONNÉES DE DÉMONSTRATION");
  });
});
