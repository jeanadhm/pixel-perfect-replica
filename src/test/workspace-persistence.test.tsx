import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DemoStoreProvider, useDemo } from "@/lib/demo/store";
import { AuthGate } from "@/components/auth/AuthGate";
import { emptyState } from "@/lib/demo/scope";
const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ api: apiMock }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
function Editor() {
  const { families, update, saving, error } = useDemo();
  return (
    <>
      <output data-testid="families">{families.join(",")}</output>
      <output data-testid="saving">{String(saving)}</output>
      <output data-testid="error">{error}</output>
      <button onClick={() => void update("families", (rows) => [...rows, "SEO"])}>Ajouter</button>
    </>
  );
}
beforeEach(() => {
  localStorage.clear();
  apiMock.mockReset();
});
function server(options: { anonymous?: boolean; failSave?: boolean } = {}) {
  let state = { ...emptyState(), families: ["AMBS"] };
  let revision = 1;
  apiMock.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path === "/auth/session")
      return {
        user: options.anonymous
          ? null
          : { id: "actual-user", name: "Équipe", email: "team@tests.invalid", role: "admin" },
        setupRequired: !!options.anonymous,
        production: false,
      };
    if (path === "/workspace") return { state: structuredClone(state), revision };
    if (path === "/workspace/families") {
      if (options.failSave) throw new Error("Conflit de sauvegarde");
      const body = JSON.parse(String(init?.body));
      expect(body.revision).toBe(revision);
      state = { ...state, families: body.items };
      return { revision: ++revision };
    }
    if (path === "/users") return { users: [] };
    if (path === "/integrations")
      return { googleConfigured: false, googleConnected: false, sites: [], runs: [] };
    if (path === "/public-pages") return { pages: [] };
    if (path.startsWith("/metrics")) return { search: [], analytics: [], runs: [] };
    throw new Error(`Unexpected API call: ${path}`);
  });
}
describe("Shared workspace UI", () => {
  it("requires the real first account before showing business data", async () => {
    server({ anonymous: true });
    render(
      <DemoStoreProvider>
        <AuthGate>
          <Editor />
        </AuthGate>
      </DemoStoreProvider>,
    );
    expect(await screen.findByText("Créer le compte de l’équipe")).toBeInTheDocument();
    expect(screen.queryByText("Ajouter")).not.toBeInTheDocument();
    expect(apiMock.mock.calls.some(([path]) => path === "/workspace")).toBe(false);
  });
  it("persists a change through the API and reloads it in a fresh UI session", async () => {
    server();
    const view = render(
      <DemoStoreProvider>
        <AuthGate>
          <Editor />
        </AuthGate>
      </DemoStoreProvider>,
    );
    fireEvent.click(await screen.findByText("Ajouter"));
    await waitFor(() => expect(screen.getByTestId("saving")).toHaveTextContent("false"));
    expect(screen.getByTestId("families")).toHaveTextContent("AMBS,SEO");
    view.unmount();
    render(
      <DemoStoreProvider>
        <AuthGate>
          <Editor />
        </AuthGate>
      </DemoStoreProvider>,
    );
    expect(await screen.findByTestId("families")).toHaveTextContent("AMBS,SEO");
  });
  it("rolls an optimistic change back when the server rejects a stale write", async () => {
    server({ failSave: true });
    render(
      <DemoStoreProvider>
        <AuthGate>
          <Editor />
        </AuthGate>
      </DemoStoreProvider>,
    );
    fireEvent.click(await screen.findByText("Ajouter"));
    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent("Conflit de sauvegarde"),
    );
    expect(screen.getByTestId("families")).toHaveTextContent(/^AMBS$/);
    expect(screen.getByTestId("saving")).toHaveTextContent("false");
  });
});
