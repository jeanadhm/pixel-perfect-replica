import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { DemoStoreProvider } from "@/lib/demo/store";
import { AuthGate } from "@/components/auth/AuthGate";
import { initialState } from "../../server/seed";
import { emptyState } from "@/lib/demo/scope";
import { PUBLIC_PAGES, PUBLIC_CHECKED_AT } from "@/lib/demo/public-pages";
import Overview from "@/views/overview";
import Sites from "@/views/sites";
import Seo from "@/views/seo";
import Geo from "@/views/geo";
import Keywords from "@/views/mots-cles";
import Prompts from "@/views/prompts";
import Actions from "@/views/actions";
import Pages from "@/views/pages";
import Audit from "@/views/audit";
import Backlinks from "@/views/backlinks";
import Competitors from "@/views/concurrents";
import Leads from "@/views/leads";
import Reports from "@/views/rapports";
import Connections from "@/views/connexions";
import Settings from "@/views/parametres";
import { NewActionDialog } from "@/components/actions/NewActionDialog";
const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ api: apiMock }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
const routes: [string, ComponentType][] = [
  ["overview", Overview],
  ["sites", Sites],
  ["seo", Seo],
  ["geo", Geo],
  ["keywords", Keywords],
  ["prompts", Prompts],
  ["actions", Actions],
  ["pages", Pages],
  ["audit", Audit],
  ["backlinks", Backlinks],
  ["competitors", Competitors],
  ["leads", Leads],
  ["reports", Reports],
  ["connections", Connections],
  ["settings", Settings],
];
const member = {
  id: "screen-test-user",
  name: "Équipe Test",
  email: "team@tests.invalid",
  role: "admin",
};
beforeEach(() => {
  apiMock.mockReset();
  localStorage.clear();
});
function mount(Page: ComponentType, populated = true) {
  let state = populated ? initialState() : emptyState();
  let revision = 1;
  apiMock.mockImplementation(async (path: string, options?: RequestInit) => {
    if (path === "/auth/session") return { user: member, setupRequired: false, production: false };
    if (path === "/workspace") return { state: structuredClone(state), revision };
    if (path === "/users") return { users: [member] };
    if (path === "/integrations")
      return { googleConfigured: false, googleConnected: false, sites: [], runs: [] };
    if (path === "/public-pages")
      return {
        pages: populated ? PUBLIC_PAGES.map((p) => ({ ...p, checkedAt: PUBLIC_CHECKED_AT })) : [],
      };
    if (path.startsWith("/metrics"))
      return {
        startDate: "2026-11-01",
        endDate: "2026-11-10",
        search: [],
        analytics: [],
        runs: [],
      };
    if (path.startsWith("/workspace/") && options?.method === "PUT") {
      const key = path.slice("/workspace/".length);
      const body = JSON.parse(String(options.body));
      expect(body.revision).toBe(revision);
      state = { ...state, [key]: body.items };
      return { revision: ++revision };
    }
    throw new Error(`Unexpected request: ${path}`);
  });
  return render(
    <DemoStoreProvider>
      <AuthGate>
        <Page />
      </AuthGate>
    </DemoStoreProvider>,
  );
}
describe.each([true, false])("Authenticated screens, populated=%s", (populated) => {
  it.each(routes)("renders %s without a runtime error", async (_route, Page) => {
    mount(Page, populated);
    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/NaN|Invalid Date|undefined/);
  });
});
describe("Working forms", () => {
  it("creates a prompt through its form", async () => {
    mount(Prompts);
    fireEvent.click(await screen.findByRole("button", { name: "Nouveau prompt" }));
    const dialog = await screen.findByRole("dialog");
    const question = within(dialog).getByLabelText("Question *");
    fireEvent.change(question, {
      target: { value: "Comment mesurer une campagne RCS chez AMBS ?" },
    });
    expect(question.closest("form")!.checkValidity()).toBe(true);
    fireEvent.submit(question.closest("form")!);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Comment mesurer une campagne RCS chez AMBS ?")).toBeInTheDocument();
  });
  it("creates a source-identified lead through its form", async () => {
    mount(Leads);
    fireEvent.click(await screen.findByRole("button", { name: "Ajouter une fiche réelle" }));
    const dialog = await screen.findByRole("dialog");
    const values = {
      company: "Entreprise fixture",
      sourceSystem: "Formulaire test",
      sourceRecordId: "fixture-1",
      evidenceUrl: "https://example.com/fixture-1",
      channel: "Formulaire",
      date: "2026-11-01",
    };
    for (const [name, value] of Object.entries(values))
      fireEvent.change(dialog.querySelector(`input[name="${name}"]`)!, { target: { value } });
    const form = dialog.querySelector("form")!;
    expect(form.checkValidity()).toBe(true);
    fireEvent.submit(form);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Entreprise fixture" })).toBeInTheDocument();
  });
  it("assigns an editorial owner while a page's H1 is still unknown", async () => {
    mount(Pages);
    const page = initialState().pages.find((item) => !item.h1)!;
    expect(page).toBeDefined();
    fireEvent.change(await screen.findByLabelText("Rechercher un contenu"), {
      target: { value: page.url },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Optimiser" })[0]!);
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Responsable éditorial"), {
      target: { value: member.name },
    });
    const form = dialog.querySelector("form")!;
    expect(form.checkValidity()).toBe(true);
    fireEvent.submit(form);
    await waitFor(() =>
      expect(apiMock.mock.calls.some(([path]) => path === "/workspace/pages")).toBe(true),
    );
  });
  it("assigns an action linked to a Factory keyword to Factory from the all-sites view", async () => {
    const keyword = initialState().keywords.find((item) => item.siteId === "factory")!;
    function KeywordAction() {
      return (
        <NewActionDialog
          defaults={{ title: "Optimiser Factory", keywordId: keyword.id, target: keyword.term }}
        />
      );
    }
    mount(KeywordAction);
    fireEvent.click(await screen.findByRole("button", { name: "Nouvelle action" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.submit(within(dialog).getByLabelText("Titre *").closest("form")!);
    await waitFor(() =>
      expect(apiMock.mock.calls.some(([path]) => path === "/workspace/actions")).toBe(true),
    );
    const call = apiMock.mock.calls.find(([path]) => path === "/workspace/actions")!;
    const saved = JSON.parse(call[1].body).items.find(
      (item: { title: string }) => item.title === "Optimiser Factory",
    );
    expect(saved.siteId).toBe("factory");
  });
  it("opens an existing action and saves its edited title", async () => {
    mount(Actions);
    const action = initialState().actions[0]!;
    fireEvent.click(await screen.findByRole("button", { name: action.title }));
    const dialog = await screen.findByRole("dialog");
    const title = within(dialog).getByDisplayValue(action.title);
    fireEvent.change(title, { target: { value: "Action vérifiée par le test" } });
    expect(title.closest("form")!.checkValidity()).toBe(true);
    fireEvent.submit(title.closest("form")!);
    await waitFor(() =>
      expect(apiMock.mock.calls.some(([path]) => path === "/workspace/actions")).toBe(true),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByRole("button", { name: "Action vérifiée par le test" }),
    ).toBeInTheDocument();
  });
});
