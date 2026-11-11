import type { DemoState } from "./schema";
import { siteForUrl, type SiteScope } from "./sites";
export function emptyState(): DemoState {
  return {
    keywords: [],
    families: [],
    prompts: [],
    geoTests: [],
    actions: [],
    pages: [],
    leads: [],
    audits: [],
    backlinks: [],
    competitors: [],
    period: "30j",
  };
}
export function scopeState(state: DemoState, scope: SiteScope): DemoState {
  if (scope === "all") return state;
  const belongs = (item: { siteId?: string | undefined; url?: string; target?: string }) =>
    (item.siteId ?? siteForUrl(item.url ?? item.target ?? "")?.id ?? "ambs") === scope;
  const pages = state.pages.filter(belongs);
  return {
    ...state,
    pages,
    keywords: state.keywords.filter(belongs),
    actions: state.actions.filter(belongs),
    prompts: state.prompts.filter(belongs),
    geoTests: state.geoTests.filter(belongs),
    leads: state.leads.filter(belongs),
    backlinks: state.backlinks.filter(belongs),
    competitors: state.competitors.filter(belongs),
    audits: state.audits.filter((a) => pages.some((p) => p.id === a.pageId)),
  };
}
