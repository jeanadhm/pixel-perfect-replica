import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DemoStoreProvider, useDemo } from "@/lib/demo/store";
import { stateSchema } from "@/lib/demo/schema";
import { seedPrompts } from "@/lib/demo/seed";
import { simulateGeoTest } from "@/lib/demo/geo";
import { serializeCsv, createReportPdf } from "@/lib/demo/export";
import { NewActionDialog } from "@/components/actions/NewActionDialog";
import { DataTable } from "@/components/shared/DataTable";
const KEY = "ambs-hub-demo-v2";
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("ambs-hub-active-workspace-v2", "demo");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function Probe() {
  const { actions, keywords, storageAvailable, reset, period, setPeriod } = useDemo();
  return (
    <>
      <output data-testid="actions">{actions.length}</output>
      <output data-testid="keywords">{keywords.length}</output>
      <output data-testid="period">{period}</output>
      <output data-testid="storage">{String(storageAvailable)}</output>
      <button onClick={() => setPeriod("7j")}>Changer la période</button>
      <button onClick={reset}>Restaurer</button>
      {actions
        .filter((a) => a.title === "Action de test")
        .map((a) => (
          <p key={a.id}>
            {a.title} · {a.category} · {a.status}
          </p>
        ))}
    </>
  );
}
function mount() {
  return render(
    <DemoStoreProvider>
      <Probe />
      <NewActionDialog />
    </DemoStoreProvider>,
  );
}
describe("demo persistence and forms", () => {
  it("creates an action, persists it across remounts, and resets the demo", async () => {
    let view = mount();
    fireEvent.click(screen.getByRole("button", { name: "Nouvelle action" }));
    fireEvent.change(screen.getByLabelText("Titre *"), { target: { value: "Action de test" } });
    fireEvent.change(screen.getByLabelText("Catégorie"), { target: { value: "GEO" } });
    fireEvent.change(screen.getByLabelText("Échéance *"), { target: { value: "2030-12-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(screen.getByTestId("actions")).toHaveTextContent("61");
    expect(screen.getByText("Action de test · GEO · À faire")).toBeInTheDocument();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(KEY)!).actions).toHaveLength(61));
    view.unmount();
    view = mount();
    expect(screen.getByText("Action de test · GEO · À faire")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Restaurer" }));
    expect(screen.getByTestId("actions")).toHaveTextContent("60");
    expect(screen.queryByText("Action de test · GEO · À faire")).not.toBeInTheDocument();
  });
  it("refuses an action whose deadline precedes its start", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Nouvelle action" }));
    fireEvent.change(screen.getByLabelText("Titre *"), { target: { value: "Action de test" } });
    fireEvent.change(screen.getByLabelText("Échéance *"), { target: { value: "2020-01-01" } });
    fireEvent.submit(screen.getByLabelText("Titre *").closest("form")!);
    expect(screen.getByTestId("actions")).toHaveTextContent("60");
  });
  it("restores defaults for structurally corrupted storage", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ keywords: [null], actions: null, period: "invalid" }),
    );
    mount();
    expect(screen.getByTestId("keywords")).toHaveTextContent("240");
    expect(screen.getByTestId("actions")).toHaveTextContent("60");
  });
  it("continues in memory when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Blocked");
    });
    mount();
    expect(screen.getByTestId("storage")).toHaveTextContent("false");
    fireEvent.click(screen.getByRole("button", { name: "Changer la période" }));
    expect(screen.getByTestId("period")).toHaveTextContent("7j");
  });
  it("validates initial data and upgrades older saves without leads", () => {
    const view = mount();
    const old = JSON.parse(localStorage.getItem(KEY)!);
    expect(stateSchema.safeParse(old).success).toBe(true);
    delete old.leads;
    view.unmount();
    localStorage.setItem(KEY, JSON.stringify(old));
    mount();
    expect(stateSchema.safeParse(JSON.parse(localStorage.getItem(KEY)!)).success).toBe(true);
  });
});
describe("data table", () => {
  it("searches from any page, sorts, and shows empty results", () => {
    render(
      <DataTable
        rows={Array.from({ length: 20 }, (_, i) => ({ id: String(i), name: `Entreprise ${i}` }))}
        search={(r) => r.name}
        columns={[{ label: "Entreprise", sort: (r) => r.name, render: (r) => r.name }]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Entreprise 2" } });
    expect(screen.getByText("Entreprise 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Suivant" })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "inexistante" } });
    expect(screen.getByText("Aucun résultat pour ces filtres.")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Entreprise ↕" }));
    fireEvent.click(screen.getByRole("button", { name: "Entreprise ↑" }));
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("Entreprise 19");
  });
});
describe("exports and local simulation", () => {
  it("escapes CSV quotes, multiline values and spreadsheet formulas", () => {
    const csv = serializeCsv([
      { expression: '=HYPERLINK("url")', note: 'Une "citation"\nDeux lignes', valeur: -10 },
    ]);
    expect(csv).toContain(`"'=HYPERLINK(""url"")"`);
    expect(csv).toContain('"Une ""citation""\nDeux lignes"');
    expect(csv).toContain('"-10"');
  });
  it("generates a clearly labelled simulation with consistent results", () => {
    const prompt = seedPrompts[0]!;
    const test = simulateGeoTest(prompt, 2);
    expect(test.mentioned).toBe(true);
    expect(test.recommended).toBe(true);
    expect(test.status).toBe("Mentionnée et recommandée");
    expect(test.response).toContain("aucun moteur IA interrogé");
    expect(test.promptId).toBe(prompt.id);
  });
});

it("builds a multipage PDF with French number formatting", async () => {
  const doc = await createReportPdf("Rapport AMBS", [
    {
      heading: "Synthèse",
      lines: [
        "Impressions : 48\u202f250",
        ...Array.from({ length: 100 }, (_, i) => `Ligne ${i + 1} : données de démonstration.`),
      ],
    },
  ]);
  expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  const pdf = doc.output();
  expect(pdf.startsWith("%PDF-")).toBe(true);
  expect(pdf).toContain("48 250");
});
