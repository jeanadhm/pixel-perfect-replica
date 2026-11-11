import { ExternalTracking } from "@/components/shared/ExternalTracking";
import { serializeCsv } from "@/lib/demo/export";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DemoStoreProvider, useDemo } from "@/lib/demo/store";
import { createAmbsState } from "@/lib/demo/reference";
import { nextDueDate, parseKeywordLines, withMeasurement } from "@/lib/demo/workflow";
import { stateSchema } from "@/lib/demo/schema";
import { KeywordWorkflow } from "@/components/keywords/KeywordWorkflow";
import { GeoRecordDialog } from "@/components/geo/GeoRecordDialog";
import type { KeywordMeasurement } from "@/lib/demo/types";
beforeEach(() => localStorage.clear());
afterEach(cleanup);
function WorkspaceProbe() {
  const { workspace, switchWorkspace, keywords, update, geoTests, restore, snapshot } = useDemo();
  const first = keywords[0]!;
  return (
    <>
      <output data-testid="space">{workspace}</output>
      <output data-testid="count">{keywords.length}</output>
      <output data-testid="notes">{first.notes}</output>
      <output data-testid="stage">{first.plan?.stage}</output>
      <output data-testid="tests">{geoTests.length}</output>
      <output data-testid="origin">{geoTests[0]?.origin}</output>
      <button onClick={() => switchWorkspace(workspace === "ambs" ? "demo" : "ambs")}>
        Basculer
      </button>
      <button
        onClick={() =>
          update("keywords", (rows) =>
            rows.map((k, i) => (i === 0 ? { ...k, notes: "Travail AMBS conservé" } : k)),
          )
        }
      >
        Noter
      </button>
      <button onClick={() => restore({ ...snapshot(), geoTests: null })}>Import invalide</button>
      <KeywordWorkflow key={workspace} keyword={first} />
      <GeoRecordDialog />
    </>
  );
}
describe("operational reference and workspace isolation", () => {
  it("starts with documented targets and no invented metrics or publication", () => {
    const state = createAmbsState();
    expect(stateSchema.safeParse(state).success).toBe(true);
    expect(state.keywords.length).toBeGreaterThan(80);
    expect(state.keywords.length).toBeLessThan(240);
    expect(
      state.keywords.every(
        (k) =>
          k.position === null &&
          k.volume === null &&
          k.difficulty === null &&
          k.plan?.targetPosition === null,
      ),
    ).toBe(true);
    expect(
      state.pages.every(
        (p) =>
          p.url.startsWith("https://ambs-agency.com/") &&
          p.published === "À vérifier" &&
          p.score === null,
      ),
    ).toBe(true);
    expect(state.geoTests).toHaveLength(0);
    expect(state.leads).toHaveLength(0);
    expect(state.actions.every((a) => a.status === "À faire")).toBe(true);
  });
  it("preserves AMBS changes when visiting the separate demo and rejects invalid restoration", async () => {
    render(
      <DemoStoreProvider>
        <WorkspaceProbe />
      </DemoStoreProvider>,
    );
    expect(screen.getByTestId("space")).toHaveTextContent("ambs");
    fireEvent.click(screen.getByRole("button", { name: "Noter" }));
    fireEvent.click(screen.getByRole("button", { name: "Basculer" }));
    expect(screen.getByTestId("space")).toHaveTextContent("demo");
    expect(screen.getByTestId("count")).toHaveTextContent("240");
    fireEvent.click(screen.getByRole("button", { name: "Basculer" }));
    expect(screen.getByTestId("notes")).toHaveTextContent("Travail AMBS conservé");
    fireEvent.click(screen.getByRole("button", { name: "Import invalide" }));
    expect(screen.getByTestId("notes")).toHaveTextContent("Travail AMBS conservé");
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem("ambs-hub-workspace-v1")!).keywords[0].notes).toBe(
        "Travail AMBS conservé",
      ),
    );
  });
  it("requires placement evidence before marking a keyword integrated", () => {
    render(
      <DemoStoreProvider>
        <WorkspaceProbe />
      </DemoStoreProvider>,
    );
    fireEvent.change(screen.getByLabelText("Étape du mot-clé"), { target: { value: "Intégré" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le plan" }));
    expect(screen.getByTestId("stage")).toHaveTextContent("À cibler");
    fireEvent.click(screen.getByLabelText("H1"));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le plan" }));
    expect(screen.getByTestId("stage")).toHaveTextContent("Intégré");
  });
  it("records a real manual observation separately from simulation", () => {
    render(
      <DemoStoreProvider>
        <WorkspaceProbe />
      </DemoStoreProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Saisir un résultat GEO" }));
    fireEvent.change(screen.getByLabelText("Réponse observée *"), {
      target: { value: "Réponse copiée depuis un test réalisé par l’équipe." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer l’observation" }));
    expect(screen.getByTestId("tests")).toHaveTextContent("1");
    expect(screen.getByTestId("origin")).toHaveTextContent("Saisie manuelle");
  });
});
describe("measurement chronology, imports and recurrence", () => {
  const measurement = (date: string, position: number | null): KeywordMeasurement => ({
    id: date,
    date,
    position,
    impressions: 100,
    clicks: 10,
    source: "Google Search Console",
    notes: "7 jours · France · mobile",
  });
  it("compares only manual measurements and keeps late-added old samples chronological", () => {
    const seed = { ...createAmbsState().keywords[0]!, position: 50, previous: 60 };
    const first = withMeasurement(seed, measurement("2026-11-10", 15));
    expect(first.previous).toBe(null);
    const second = withMeasurement(first, measurement("2026-11-11", 8));
    expect(second.previous).toBe(15);
    expect(second.position).toBe(8);
    const historical = withMeasurement(second, measurement("2026-11-01", 20));
    expect(historical.position).toBe(8);
    expect(historical.previous).toBe(15);
    const corrected = withMeasurement(historical, measurement("2026-11-11", 7));
    expect(corrected.measurements).toHaveLength(3);
    expect(corrected.position).toBe(7);
  });
  it("deduplicates pasted terms against both existing and newly pasted lines", () => {
    expect(
      parseKeywordLines("WhatsApp marketing\n• Nouveau mot-clé\n nouveau mot-clé \n", [
        "whatsapp marketing",
      ]),
    ).toEqual({ terms: ["Nouveau mot-clé"], duplicates: 2 });
  });
  it.each([
    ["2026-11-11", "Hebdomadaire", "2026-11-18"],
    ["2026-11-11", "Bimensuelle", "2026-11-25"],
    ["2027-01-31", "Mensuelle", "2027-02-28"],
    ["2027-01-31", "Trimestrielle", "2027-04-30"],
  ] as const)("schedules %s / %s as %s", (date, recurrence, expected) =>
    expect(nextDueDate(date, recurrence)).toBe(expected),
  );
});

it("stores a backlink without inventing its authority", () => {
  render(
    <DemoStoreProvider>
      <ExternalTracking kind="backlinks" />
    </DemoStoreProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Ajouter un backlink" }));
  fireEvent.change(screen.getByLabelText("URL source du backlink"), {
    target: { value: "https://exemple.fr/article-ambs" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
  const state = JSON.parse(localStorage.getItem("ambs-hub-workspace-v1")!);
  expect(state.backlinks).toHaveLength(1);
  expect(state.backlinks[0].authority).toBeNull();
  expect(screen.getByText("exemple.fr")).toBeInTheDocument();
});
it("stores a competitor without inventing its visibility", () => {
  render(
    <DemoStoreProvider>
      <ExternalTracking kind="competitors" />
    </DemoStoreProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Ajouter un concurrent" }));
  fireEvent.change(screen.getByLabelText("Nom du concurrent"), {
    target: { value: "Concurrent observé" },
  });
  fireEvent.change(screen.getByLabelText("Site du concurrent"), {
    target: { value: "https://concurrent.example" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
  const state = JSON.parse(localStorage.getItem("ambs-hub-workspace-v1")!);
  expect(state.competitors).toHaveLength(1);
  expect(state.competitors[0].seoVisibility).toBeNull();
  expect(state.competitors[0].geoPresence).toBeNull();
});
it("exports optional metrics even when only later rows contain them", () => {
  expect(serializeCsv([{ title: "Première" }, { title: "Mesurée", result: 12 }])).toBe(
    '"title";"result"\n"Première";""\n"Mesurée";"12"',
  );
});
