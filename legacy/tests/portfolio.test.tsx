import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { createPortfolioState, scopeState } from "@/lib/demo/portfolio";
import { PUBLIC_PAGES } from "@/lib/demo/public-pages";
import { SITES, siteForUrl } from "@/lib/demo/sites";
import { stateSchema } from "@/lib/demo/schema";
import { windowStats } from "@/lib/demo/utils";
import { DemoStoreProvider, useDemo } from "@/lib/demo/store";
beforeEach(() => localStorage.clear());
afterEach(cleanup);
it("covers each public URL and keeps keyword/action relationships within its site", () => {
  const state = createPortfolioState();
  expect(stateSchema.safeParse(state).success).toBe(true);
  expect(new Set(state.pages.map((p) => p.url))).toEqual(new Set(PUBLIC_PAGES.map((p) => p.url)));
  for (const site of SITES) {
    const scope = scopeState(state, site.id);
    expect(scope.pages.length).toBeGreaterThan(0);
    expect(scope.keywords.length).toBeGreaterThan(0);
    expect(scope.geoTests.length).toBeGreaterThan(0);
    expect(scope.actions.length).toBeGreaterThan(0);
    expect(scope.keywords.every((k) => siteForUrl(k.url)?.id === site.id)).toBe(true);
    expect(scope.actions.every((a) => scope.pages.some((p) => p.id === a.pageId))).toBe(true);
    expect(scope.audits.every((a) => scope.pages.some((p) => p.id === a.pageId))).toBe(true);
    expect(scope.geoTests.every((t) => t.origin === "Simulation")).toBe(true);
  }
});
it("partitions simulated traffic without changing portfolio totals", () => {
  for (const metric of ["clicks", "impressions", "sessions"] as const) {
    expect(SITES.reduce((n, s) => n + windowStats(30, 0, s.id)[metric], 0)).toBe(
      windowStats(30)[metric],
    );
  }
});
function Probe() {
  const { setSiteScope, siteScope, actions, keywords, update, snapshot } = useDemo();
  return (
    <>
      <output data-testid="scope">{siteScope}</output>
      <output data-testid="visible">{actions.length}</output>
      <output data-testid="total">{snapshot().actions.length}</output>
      <output data-testid="note">{keywords[0]?.notes}</output>
      <button onClick={() => setSiteScope("leads")}>Leads</button>
      <button onClick={() => setSiteScope("dialagent")}>DialAgent</button>
      <button
        onClick={() =>
          update("keywords", (items) =>
            items.map((k) => (k.id === keywords[0]?.id ? { ...k, notes: "Préservé" } : k)),
          )
        }
      >
        Noter
      </button>
      <button
        onClick={() =>
          update("actions", (items) => [
            {
              ...items[0]!,
              id: "custom-action",
              siteId: undefined,
              title: "Action locale",
              pageId: "",
              promptId: "",
              keywordId: "",
              target: "",
            },
            ...items,
          ])
        }
      >
        Ajouter
      </button>
    </>
  );
}
it("saves a scoped edit without overwriting other sites and assigns new items", async () => {
  let view = render(
    <DemoStoreProvider>
      <Probe />
    </DemoStoreProvider>,
  );
  fireEvent.click(screen.getByText("Leads"));
  fireEvent.click(screen.getByText("Noter"));
  fireEvent.click(screen.getByText("Ajouter"));
  expect(screen.getByTestId("visible")).toHaveTextContent("16");
  expect(screen.getByTestId("total")).toHaveTextContent("61");
  fireEvent.click(screen.getByText("DialAgent"));
  expect(screen.getByTestId("visible")).toHaveTextContent("15");
  await waitFor(() =>
    expect(JSON.parse(localStorage.getItem("ambs-hub-demo-v2")!).actions).toHaveLength(61),
  );
  view.unmount();
  view = render(
    <DemoStoreProvider>
      <Probe />
    </DemoStoreProvider>,
  );
  expect(screen.getByTestId("scope")).toHaveTextContent("dialagent");
  fireEvent.click(screen.getByText("Leads"));
  expect(screen.getByTestId("note")).toHaveTextContent("Préservé");
  expect(screen.getByTestId("visible")).toHaveTextContent("16");
});
