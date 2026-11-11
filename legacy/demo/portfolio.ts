import { PUBLIC_PAGES } from "./public-pages";
import { SITES, siteForUrl, type SiteScope } from "./sites";
import {
  seedActions,
  seedBacklinks,
  seedCompetitors,
  seedGeoTests,
  seedKeywords,
  seedLeads,
  seedPages,
  seedPrompts,
} from "./seed";
import type { DemoState } from "./schema";
import type { SitePage } from "./types";
import { AUDIT_CHECKS } from "./audit";

function familyFor(text: string, fallback: string) {
  const value = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const groups: [RegExp, string][] = [
    [/automobile|concession/, "Automobile"],
    [/immobili|habitat/, "Immobilier"],
    [/reactiv|relance/, "Réactivation CRM"],
    [/whatsapp/, "WhatsApp marketing"],
    [/rcs|mobile/, "RCS marketing"],
    [/crm|hubspot|integration/, "Intégrations CRM"],
    [/scoring|qualification/, "Qualification & scoring"],
    [/routage/, "Routage commercial"],
    [/rendez.vous/, "Prise de rendez-vous"],
    [/standard|entrants/, "Accueil téléphonique"],
    [/vocal|telephoni|appels/, "Agents vocaux"],
    [/leads|prospect/, "Lead Management"],
    [/automation|automatisation/, "Business Automation"],
    [/conversationnel/, "Marketing conversationnel"],
  ];
  return groups.find(([pattern]) => pattern.test(value))?.[1] ?? fallback;
}

export function createPortfolioState(): DemoState {
  const pages: SitePage[] = PUBLIC_PAGES.map((record, i) => {
    const site = siteForUrl(record.url)!;
    const path = new URL(record.url).pathname;
    const type: SitePage["type"] = path.includes("/blog/")
      ? "Article de blog"
      : path.includes("/cas-clients/")
        ? "Étude de cas"
        : /industries|roles/.test(path)
          ? "Page secteur"
          : /plateforme|use-cases|standard|appels|monetisation/.test(path)
            ? "Page solution"
            : "Page institutionnelle";
    return {
      ...seedPages[i % seedPages.length]!,
      id: `site-page-${i + 1}`,
      siteId: site.id,
      name: path === "/" ? `${site.name} · Accueil` : record.name,
      url: record.url,
      canonical: record.url,
      type,
      family: familyFor(record.url + " " + record.name, site.family),
      mainKeyword: site.terms[i % site.terms.length]!,
      keywordCount: 0,
      published: record.status === 200 ? "Publiée" : "À vérifier",
      indexed: i % 7 === 0 ? "Non indexée" : "Indexée",
      score: 42 + ((i * 13) % 53),
      clicks: 12 + ((i * 47) % 700),
      title: record.title,
      h1: record.h1,
      meta: record.meta,
      h2: "Bénéfices · Fonctionnement · Questions fréquentes",
    };
  });
  const keywords = seedKeywords.map((keyword, i) => {
    const si = i < 96 ? 0 : i < 160 ? 1 : i < 224 ? 2 : 3;
    const site = SITES[si]!;
    const offset = i - [0, 96, 160, 224][si]!;
    const suffix = [
      "",
      " entreprise",
      " PME",
      " France",
      " comparatif",
      " solution",
      " guide",
      " intégration",
      " devis",
      " exemples",
      " avantages",
      " coût",
    ][Math.floor(offset / 8)]!;
    const term = `${site.terms[offset % 8]}${suffix}`;
    const candidates = pages.filter(
      (p) =>
        p.siteId === site.id &&
        p.published === "Publiée" &&
        !/legales|cgv|confidential|protection/.test(p.url),
    );
    const normalize = (value: string) =>
      value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const tokens = normalize(term)
      .split(/\W+/)
      .filter((v) => v.length > 3);
    const score = (p: SitePage) =>
      tokens.filter((t) => normalize(p.url + " " + p.name).includes(t)).length;
    const ranked = [...candidates].sort((a, b) => score(b) - score(a));
    const page = ranked[0]!;
    const integrated = keyword.position !== null;
    return {
      ...keyword,
      siteId: site.id,
      term,
      family: familyFor(term, site.family),
      intent: /prix|coût|devis/.test(term)
        ? ("Transactionnelle" as const)
        : /guide|exemples/.test(term)
          ? ("Informationnelle" as const)
          : ("Commerciale" as const),
      url: page.url,
      notes:
        "Expression et indicateurs de démonstration adaptés à ce site. Aucune mesure Search Console.",
      plan: {
        stage: integrated ? ("Intégré" as const) : ("À intégrer" as const),
        priority: offset % 3 === 0 ? ("Haute" as const) : ("Moyenne" as const),
        owner: page.owner,
        targetPosition: 10,
        placements: integrated ? ["Title", "H1"] : [],
        contentUrl: page.url,
        updatedAt: "2026-11-10",
      },
      measurements: [14, 7, 0].map((ago, n) => ({
        id: `sample-${i}-${n}`,
        date: new Date(Date.UTC(2026, 10, 10 - ago)).toISOString().slice(0, 10),
        position: keyword.position === null ? null : Math.min(100, keyword.position + 2 - n),
        impressions: 120 + i * 9 + n * 13,
        clicks: 3 + (i % 16) + n,
        source: "Simulation locale",
        notes: "Exemple fictif",
      })),
    };
  });
  pages.forEach((p) => {
    p.keywordCount = keywords.filter((k) => k.url === p.url).length;
  });
  const prompts = seedPrompts.map((p, i) => {
    const site = SITES[i % SITES.length]!;
    const term = site.terms[Math.floor(i / SITES.length) % site.terms.length]!;
    return {
      ...p,
      siteId: site.id,
      category: familyFor(term, site.family),
      question: `Quelle solution choisir pour ${term} ?`,
    };
  });
  const geoTests = seedGeoTests.map((t) => {
    const prompt = prompts.find((p) => p.id === t.promptId)!;
    const site = SITES.find((s) => s.id === prompt.siteId)!;
    return {
      ...t,
      siteId: site.id,
      origin: "Simulation" as const,
      question: prompt.question,
      sources: t.mentioned ? [site.url + "/"] : ["https://comparatif-ia.example/"],
      response: `[Simulation locale — aucun moteur IA interrogé]\n\nQuestion : ${prompt.question}\n\n${t.mentioned ? `${site.name} est cité dans cet exemple pour : ${site.focus}.` : `${site.name} n’est pas cité dans cet exemple.`}\nÉvaluation fictive : ${t.status}.`,
    };
  });
  const actions = seedActions.map((a, i) => {
    const site = SITES[i % SITES.length]!;
    const candidates = keywords.filter((k) => k.siteId === site.id);
    const keyword = candidates[Math.floor(i / SITES.length) % candidates.length]!;
    const page = pages.find((p) => p.url === keyword.url)!;
    const prompt = prompts.find((p) => p.siteId === site.id)!;
    const task =
      a.category === "SEO"
        ? [
            "Optimiser le title et le H1",
            "Renforcer le maillage interne",
            "Aligner le contenu sur l’intention",
            "Ajouter une preuve métier",
            "Améliorer le parcours de démonstration",
          ][i % 5]
        : [
            "Structurer une réponse citable",
            "Tester la présence dans les IA",
            "Compléter les FAQ produit",
            "Clarifier les différences entre offres",
            "Renforcer les sources et la méthodologie",
          ][i % 5];
    return {
      ...a,
      siteId: site.id,
      title: `${site.name} · ${task}`,
      description: `${task} sur ${page.url} pour l’expression « ${keyword.term} ». Scénario de démonstration.`,
      target: page.url,
      pageId: page.id,
      keywordId: keyword.id,
      promptId: prompt.id,
      baseline: 18,
      goal: 10,
      result: a.status === "Terminé" ? 9 : null,
      metricUnit: "position",
      recurrence: "Mensuelle" as const,
      proofUrl: "",
      comments: "Statut et résultats fictifs, aucune modification effectuée sur le site.",
    };
  });
  return {
    pages,
    keywords,
    prompts,
    geoTests,
    actions,
    families: [...new Set(keywords.map((k) => k.family))],
    leads: seedLeads.map((l, i) => {
      const site = SITES[i % SITES.length]!;
      return { ...l, siteId: site.id, origin: pages.find((p) => p.siteId === site.id)!.url };
    }),
    backlinks: seedBacklinks.map((b, i) => {
      const site = SITES[i % SITES.length]!;
      return {
        ...b,
        siteId: site.id,
        target: site.url + "/",
        domain: `media-${i + 1}.example`,
        source: `https://media-${i + 1}.example/article`,
      };
    }),
    competitors: SITES.flatMap((site, i) =>
      seedCompetitors.map((c, j) => ({
        ...c,
        id: `${site.id}-${c.id}`,
        siteId: site.id,
        seoVisibility: 18 + i * 7 + j * 4,
        geoPresence: 13 + i * 6 + j * 3,
        topTerms: [...site.terms].slice(j, j + 3),
      })),
    ),
    audits: pages.flatMap((p, i) =>
      AUDIT_CHECKS.map((c, j) => ({
        id: `sample-audit-${i}-${j}`,
        pageId: p.id,
        checkId: c[0],
        status:
          (i + j) % 5 === 0
            ? ("À corriger" as const)
            : (i + j) % 7 === 0
              ? ("À vérifier" as const)
              : ("Conforme" as const),
        notes: "Évaluation fictive pour illustrer le suivi. À vérifier lors d’un audit réel.",
        evidenceUrl: "",
        checkedAt: "2026-11-10",
      })),
    ),
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
    families: state.families,
  };
}
