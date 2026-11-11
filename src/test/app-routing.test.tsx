import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { NAV } from "@/components/layout/nav";
describe("App routing", () => {
  it.each(NAV.flatMap((group) => group.items))("resolves $url ($title)", ({ url }) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const match = router.matchRoutes(url).at(-1);
    expect(match?.routeId).not.toBe(rootRouteId);
    expect(match?.pathname).toBe(url);
    expect(router.routesById[match!.routeId]?.options.component).toBeDefined();
  });
  it("keeps unknown URLs out of known content routes", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes("/inconnue").at(-1)?.routeId).toBe(rootRouteId);
  });
});
