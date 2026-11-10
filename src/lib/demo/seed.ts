import type {
  Action, ActionStatus, Backlink, Competitor, DailyPoint, GeoPrompt, GeoStatus, GeoTest, Intent,
  Keyword, Lead, Mention, Platform, Priority, SitePage, PageType,
} from "./types";

// Deterministic RNG so the demo is identical on server and client renders.
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r = rng(42);
const int = (a: number, b: number) => Math.floor(r() * (b - a + 1)) + a;
// Non-deterministic index helper: never call it inside the RNG-driven generators below.
const at = <T>(arr: readonly T[], i: number): T => {
  const v = arr[i];
  if (v === undefined) throw new Error(`Index ${i} hors limites (${arr.length})`);
  return v;
};
const pick = <T>(arr: readonly T[]): T => at(arr, Math.floor(r() * arr.length));
const sample = <T,>(arr: readonly T[], n: number) => [...arr].sort(() => r() - 0.5).slice(0, n);

export const TODAY = new Date("2026-11-10T09:00:00Z");
const dayOffset = (d: number) => new Date(TODAY.getTime() + d * 86400000).toISOString().slice(0, 10);

export const OWNERS = ["Sarah Benali", "Thomas Durand", "Inès Moreau", "Karim Haddad", "Julie Martin"];
export const PLATFORMS: Platform[] = ["ChatGPT Search", "Google AI Overviews", "Microsoft Copilot", "Perplexity", "Gemini"];
export const COMPETITOR_NAMES = ["Nova Conversations", "Kairo Digital", "Bluewave Automation", "Orbis Messaging"];

export const FAMILIES: { name: string; slug: string; base: string[] }[] = [
  { name: "Marketing conversationnel", slug: "marketing-conversationnel", base: ["marketing conversationnel", "agence marketing conversationnel", "stratégie conversationnelle", "chatbot marketing", "commerce conversationnel"] },
  { name: "WhatsApp marketing", slug: "whatsapp-marketing", base: ["whatsapp marketing", "agence whatsapp marketing", "stratégie whatsapp", "marketing sur whatsapp", "whatsapp pour entreprise"] },
  { name: "WhatsApp acquisition", slug: "whatsapp-acquisition", base: ["acquisition whatsapp", "générer des leads whatsapp", "prospection whatsapp", "click to whatsapp ads"] },
  { name: "Campagnes WhatsApp", slug: "campagnes-whatsapp", base: ["campagne whatsapp", "envoi massif whatsapp", "newsletter whatsapp", "broadcast whatsapp"] },
  { name: "WhatsApp Business API", slug: "whatsapp-business-api", base: ["whatsapp business api", "intégration whatsapp api", "fournisseur whatsapp api", "whatsapp cloud api"] },
  { name: "RCS marketing", slug: "rcs-marketing", base: ["rcs marketing", "campagne rcs", "rcs business messaging", "sms enrichi rcs"] },
  { name: "Marketing automation", slug: "marketing-automation", base: ["marketing automation", "agence marketing automation", "scénarios automatisés", "automatisation marketing b2b"] },
  { name: "Lead Management", slug: "lead-management", base: ["lead management", "gestion des leads", "qualification des leads", "lead scoring"] },
  { name: "Business Automation", slug: "business-automation", base: ["business automation", "automatisation des processus", "agence automatisation", "automatisation no code"] },
  { name: "Agents IA", slug: "agents-ia", base: ["agent ia", "agence agents ia", "agent ia service client", "intégration agent ia"] },
  { name: "Réactivation CRM", slug: "reactivation-crm", base: ["réactivation crm", "relance base clients", "réactiver clients inactifs", "nurturing crm"] },
  { name: "Meta / Acquisition", slug: "meta-acquisition", base: ["publicité meta", "acquisition facebook ads", "lead ads meta", "agence meta ads"] },
  { name: "SMS et messagerie mobile", slug: "sms-messagerie", base: ["sms marketing", "campagne sms", "messagerie mobile entreprise", "sms professionnel"] },
];
const MODIFIERS = ["", " prix", " france", " pme", " b2b", " outil", " exemple", " définition", " avantages", " solution", " paris", " guide"];
const INTENTS: Intent[] = ["Informationnelle", "Commerciale", "Transactionnelle"];

// Visible position buckets (86 total): top3 6, 4-10 14, 11-20 18, 21-50 26, >50 22.
const positions: number[] = [
  ...Array.from({ length: 6 }, () => int(1, 3)),
  ...Array.from({ length: 14 }, () => int(4, 10)),
  ...Array.from({ length: 18 }, () => int(11, 20)),
  ...Array.from({ length: 26 }, () => int(21, 50)),
  ...Array.from({ length: 22 }, () => int(51, 95)),
];

function buildKeywords(): Keyword[] {
  const terms: { term: string; family: string; slug: string }[] = [];
  for (const m of MODIFIERS) for (const f of FAMILIES) for (const b of f.base) {
    if (terms.length >= 240) break;
    terms.push({ term: (b + m).trim(), family: f.name, slug: f.slug });
  }
  // interleave visible keywords across families
  const visibleIdx = new Set(sample(terms.map((_, i) => i).slice(0, 120), 70).concat(sample(terms.map((_, i) => i).slice(120), 16)));
  let v = 0;
  return terms.slice(0, 240).map((t, i) => {
    const visible = visibleIdx.has(i);
    const position: number | null = visible ? at(positions, v) : null;
    let previous: number | null = null;
    if (visible && position !== null) {
      const k = v; v++;
      if (k % 3 === 0 && k < 84) previous = position + int(2, 9); // progression (28)
      else if (k % 7 === 1 && k < 84) previous = Math.max(1, position - int(2, 6)); // régression
      else previous = position;
    }
    const history = Array.from({ length: 12 }, (_, w) => {
      const label = `S${w + 35}`;
      if (!visible || position === null) return { week: label, position: null };
      const start = previous ?? position;
      const p = Math.round(start + ((position - start) * w) / 11 + (w < 11 ? int(-2, 2) : 0));
      return { week: label, position: Math.max(1, p) };
    });
    return {
      id: `kw-${i + 1}`,
      term: t.term,
      family: t.family,
      intent: t.term.includes("prix") || t.term.includes("agence") ? "Transactionnelle" : t.term.includes("définition") || t.term.includes("guide") || t.term.includes("exemple") ? "Informationnelle" : pick(INTENTS),
      position,
      previous,
      volume: pick([30, 50, 70, 90, 110, 140, 170, 210, 260, 320, 480, 720, 880, 1300, 1900, 2400]),
      difficulty: int(8, 78),
      url: `https://ambs-agency.fr/${t.slug}`,
      history,
      competitors: sample(COMPETITOR_NAMES, 3).map((n) => ({ name: n, position: int(1, 30) })).sort((a, b) => a.position - b.position),
      lastCheck: dayOffset(-int(0, 4)),
      notes: "",
    };
  });
}
// fix exact progression/regression counts deterministically
function normalizeTrends(kws: Keyword[]) {
  const vis = kws.filter((k) => k.position !== null);
  vis.forEach((k, i) => {
    if (!k.position) return;
    if (i < 28) k.previous = k.position + 3 + (i % 6);
    else if (i < 40) k.previous = Math.max(1, k.position - 2 - (i % 4));
    else k.previous = k.position;
    if (k.previous === k.position && i < 40) k.previous = k.position + (i < 28 ? 1 : -1);
  });
  return kws;
}
export const seedKeywords = normalizeTrends(buildKeywords());

const BASE_PROMPTS: [string, string][] = [
  ["Quelle agence propose des solutions de marketing conversationnel ?", "Marketing conversationnel"],
  ["Quelles entreprises peuvent automatiser leur relation client avec WhatsApp ?", "WhatsApp marketing"],
  ["Quelle agence accompagne les entreprises dans l'intégration d'agents IA ?", "Agents IA"],
  ["Quelles solutions existent pour automatiser la prospection commerciale ?", "Lead Management"],
  ["Quelle agence propose des solutions de Business Automation ?", "Business Automation"],
  ["Comment automatiser la gestion des prospects d'une entreprise ?", "Lead Management"],
  ["Quelles agences proposent des solutions WhatsApp Business API ?", "WhatsApp Business API"],
  ["Quel prestataire choisir pour lancer une campagne WhatsApp en France ?", "Campagnes WhatsApp"],
  ["Comment générer des leads qualifiés avec WhatsApp ?", "WhatsApp acquisition"],
  ["Quelle est la meilleure agence RCS en France ?", "RCS marketing"],
  ["Le RCS peut-il remplacer le SMS marketing ?", "RCS marketing"],
  ["Quelle agence de marketing automation pour une PME ?", "Marketing automation"],
  ["Comment réactiver des clients inactifs dans un CRM ?", "Réactivation CRM"],
  ["Quels outils pour qualifier automatiquement des leads entrants ?", "Lead Management"],
  ["Qui peut créer un agent IA pour le service client ?", "Agents IA"],
  ["Comment connecter WhatsApp à son CRM ?", "WhatsApp Business API"],
  ["Quelles sont les meilleures pratiques du commerce conversationnel ?", "Marketing conversationnel"],
  ["Quelle agence gère des campagnes Click-to-WhatsApp sur Meta ?", "Meta / Acquisition"],
  ["Comment réduire le coût par lead sur Facebook Ads ?", "Meta / Acquisition"],
  ["Quel est le prix de l'API WhatsApp Business ?", "WhatsApp Business API"],
  ["Comment envoyer des SMS professionnels en masse ?", "SMS et messagerie mobile"],
  ["Quelle agence pour automatiser ses processus métier sans code ?", "Business Automation"],
  ["Comment mettre en place un lead scoring efficace ?", "Lead Management"],
  ["Quels sont les avantages d'un chatbot WhatsApp pour un e-commerce ?", "Marketing conversationnel"],
  ["Comment relancer automatiquement les devis non signés ?", "Réactivation CRM"],
  ["Quelle agence française maîtrise WhatsApp et l'IA ?", "Agents IA"],
  ["Comment structurer un scénario de nurturing B2B ?", "Marketing automation"],
  ["Quelles agences recommandez-vous pour la messagerie mobile en entreprise ?", "SMS et messagerie mobile"],
  ["Comment mesurer le ROI d'une campagne WhatsApp ?", "Campagnes WhatsApp"],
  ["Quelle agence aide à prendre plus de rendez-vous commerciaux grâce à l'automatisation ?", "Business Automation"],
];
export const seedPrompts: GeoPrompt[] = BASE_PROMPTS.map(([q, c], i) => ({
  id: `pr-${i + 1}`,
  question: q,
  category: c,
  intent: q.startsWith("Comment") || q.startsWith("Le ") ? "Informationnelle" : q.includes("prix") ? "Transactionnelle" : "Commerciale",
  platform: at(PLATFORMS, i % 5),
  frequency: i % 3 === 0 ? "Hebdomadaire" : i % 3 === 1 ? "Bimensuelle" : "Mensuelle",
}));

const SOURCES = ["ambs-agency.fr", "lesechos.fr", "journaldunet.com", "blogdumoderateur.com", "g2.com", "capterra.fr", "meta.com", "frenchweb.fr", "hubspot.fr", "linkedin.com"];
// 32% mention rate on the overall test set.
export function buildGeoTests(prompts: GeoPrompt[]): GeoTest[] {
  const tests: GeoTest[] = [];
  const total = 150;
  for (let i = 0; i < total; i++) {
    const p = at(prompts, i % prompts.length);
    const platform = i < 30 ? p.platform : at(PLATFORMS, (i + Math.floor(i / 30)) % 5);
    const mentioned = i % 25 < 8; // exactly 8/25 = 32%
    const incorrect = mentioned && i % 25 === 7;
    const recommended = mentioned && !incorrect && i % 25 < 4;
    const status: GeoStatus = incorrect ? "Réponse incorrecte" : recommended ? "Mentionnée et recommandée" : mentioned ? "Mentionnée sans recommandation" : "Non mentionnée";
    const comps = sample(COMPETITOR_NAMES, int(1, 3));
    const sources = sample(SOURCES.slice(mentioned ? 0 : 1), int(2, 4));
    const pos = mentioned ? int(1, 5) : null;
    const brands = mentioned ? [...comps.slice(0, (pos ?? 1) - 1), "AMBS Agency", ...comps.slice((pos ?? 1) - 1)] : comps;
    tests.push({
      id: `geo-${i + 1}`,
      promptId: p.id,
      date: new Date(TODAY.getTime() - Math.floor((i * 90) / total) * 86400000 - int(1, 10) * 3600000).toISOString(),
      platform,
      question: p.question,
      mentioned,
      recommended,
      accuracy: !mentioned ? "—" : incorrect ? "Incorrecte" : i % 5 === 2 ? "Partielle" : "Exacte",
      mentionPosition: pos,
      competitors: comps,
      sources,
      status,
      response: `[Réponse simulée — démonstration]\n\nPour répondre à « ${p.question} », plusieurs acteurs sont généralement cités :\n\n${brands.map((b, k) => `${k + 1}. ${b}${b === "AMBS Agency" ? (incorrect ? " — présentée à tort comme un éditeur de logiciel SMS uniquement." : recommended ? " — agence spécialisée en marketing conversationnel, WhatsApp Business API et agents IA, souvent recommandée pour les PME et ETI." : " — agence active sur WhatsApp et l'automatisation.") : " — acteur fictif de démonstration."}`).join("\n")}\n\nSources : ${sources.join(", ")}.`,
    });
  }
  return tests.sort((a, b) => b.date.localeCompare(a.date));
}
export const seedGeoTests = buildGeoTests(seedPrompts);

const SEO_ACTIONS = ["Audit technique complet du site", "Optimiser la page WhatsApp Business API", "Créer la page Agents IA", "Refondre le maillage interne des pages solutions", "Corriger les erreurs 404", "Optimiser les balises title des pages secteurs", "Rédiger l'article « Guide WhatsApp marketing 2026 »", "Publier l'étude de cas Retail", "Améliorer le Core Web Vitals mobile", "Créer le cluster RCS marketing", "Optimiser les meta descriptions", "Ajouter le balisage FAQ", "Créer la page Lead Management", "Rédiger 4 articles Marketing automation", "Soumettre le sitemap mis à jour", "Optimiser les images (WebP)", "Créer la page Réactivation CRM", "Analyser la cannibalisation des mots-clés", "Mettre à jour la page Business Automation", "Campagne de netlinking thématique", "Créer la page Campagnes WhatsApp", "Optimiser la page d'accueil", "Rédiger l'article « Prix API WhatsApp »", "Créer la page SMS professionnel", "Ajouter les données structurées Organization", "Créer un glossaire conversationnel", "Optimiser les ancres internes", "Corriger les redirections en chaîne", "Créer la page Meta Ads", "Publier l'étude de cas Immobilier"];
const GEO_ACTIONS = ["Rédiger la page « À propos » orientée entités", "Créer une FAQ citable par les IA", "Publier des statistiques propriétaires", "Mettre à jour la fiche Google Business Profile", "Obtenir une citation sur un média tech", "Créer le fichier llms.txt", "Tester 30 prompts sur ChatGPT", "Tester 30 prompts sur Perplexity", "Tester 30 prompts sur Gemini", "Tester 30 prompts sur Copilot", "Analyser les AI Overviews sur 20 requêtes", "Corriger la description d'AMBS sur Wikidata", "Uniformiser la description de marque", "Publier un livre blanc WhatsApp", "Obtenir des avis clients sur G2", "Obtenir des avis sur Capterra", "Rédiger des définitions claires par service", "Ajouter des tableaux comparatifs", "Créer des pages « Meilleure agence » factuelles", "Publier une tribune LinkedIn", "Participer à un podcast sectoriel", "Mettre à jour les profils annuaires", "Créer une page méthodologie", "Ajouter des citations d'experts", "Structurer les études de cas (résultats chiffrés)", "Surveiller les réponses incorrectes", "Créer un communiqué de presse", "Ajouter le schéma FAQPage", "Rédiger un guide Agents IA", "Mettre en place le suivi mensuel GEO"];
const STATUSES: ActionStatus[] = ["Terminé", "Terminé", "Terminé", "En cours", "À faire", "En attente", "Bloqué", "Terminé", "En cours", "À faire"];
const PRIORITIES: Priority[] = ["Critique", "Haute", "Haute", "Moyenne", "Moyenne", "Basse"];

export const seedActions: Action[] = [...SEO_ACTIONS.map((t) => ["SEO", t] as const), ...GEO_ACTIONS.map((t) => ["GEO", t] as const)].map(([cat, title], i) => {
  const start = int(-80, 10);
  const status = at(STATUSES, (i * 7) % 10);
  return {
    id: `act-${i + 1}`,
    title,
    description: `${title}. Action du plan ${cat} AMBS visant à améliorer la visibilité ${cat === "SEO" ? "sur Google" : "dans les moteurs IA"}.`,
    category: cat,
    priority: at(PRIORITIES, (i * 5) % 6),
    owner: at(OWNERS, i % OWNERS.length),
    start: dayOffset(start),
    due: dayOffset(start + int(10, 45)),
    status,
    target: cat === "SEO" ? pick(FAMILIES).name : pick(PLATFORMS),
    deliverable: cat === "SEO" ? pick(["Page publiée", "Rapport d'audit", "Article de blog", "Correctifs déployés"]) : pick(["Contenu publié", "Rapport de tests", "Citation obtenue", "Fiche mise à jour"]),
    kpi: cat === "SEO" ? pick(["Position moyenne", "Clics organiques", "Mots-clés top 10", "Pages indexées"]) : pick(["Taux de mention IA", "Taux de recommandation", "Citations de sources"]),
    comments: "",
  };
});

const PAGE_DEFS: [string, PageType, number][] = [
  ["Accueil", "Page institutionnelle", 0], ["Marketing conversationnel", "Page solution", 0], ["WhatsApp marketing", "Page solution", 1], ["WhatsApp Business API", "Page solution", 4], ["Campagnes WhatsApp", "Page solution", 3], ["RCS marketing", "Page solution", 5], ["Marketing automation", "Page solution", 6], ["Lead Management", "Page solution", 7], ["Business Automation", "Page solution", 8], ["Agents IA", "Page solution", 9], ["Réactivation CRM", "Page solution", 10], ["Meta Ads & acquisition", "Page solution", 11], ["SMS professionnel", "Page solution", 12],
  ["Secteur Immobilier", "Page secteur", 1], ["Secteur Retail", "Page secteur", 0], ["Secteur Automobile", "Page secteur", 2], ["Secteur Formation", "Page secteur", 7],
  ["Étude de cas — Réseau immobilier", "Étude de cas", 1], ["Étude de cas — Enseigne retail", "Étude de cas", 3], ["Étude de cas — Concession auto", "Étude de cas", 9],
  ["Guide WhatsApp marketing 2026", "Article de blog", 1], ["Prix de l'API WhatsApp", "Article de blog", 4], ["RCS vs SMS", "Article de blog", 5], ["Qu'est-ce qu'un agent IA ?", "Article de blog", 9], ["Lead scoring : la méthode", "Article de blog", 7],
  ["À propos", "Page institutionnelle", 0], ["Méthodologie", "Page institutionnelle", 0], ["Contact", "Page institutionnelle", 0],
];
export const seedPages: SitePage[] = PAGE_DEFS.map(([name, type, fi], i) => {
  const f = at(FAMILIES, fi);
  const slug = name === "Accueil" ? "" : name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const prefix = type === "Article de blog" ? "blog/" : type === "Étude de cas" ? "etudes-de-cas/" : type === "Page secteur" ? "secteurs/" : "";
  const published = i % 9 === 8 ? "Brouillon" : i % 13 === 12 ? "À créer" : "Publiée";
  const indexed = published !== "Publiée" ? "Non indexée" : i % 7 === 5 ? "En attente" : i % 11 === 10 ? "Non indexée" : "Indexée";
  const url = `https://ambs-agency.fr/${prefix}${slug}`;
  return {
    id: `pg-${i + 1}`, name, url, type, family: f.name, mainKeyword: at(f.base, 0), keywordCount: int(3, 18),
    published, indexed, score: published === "Publiée" ? int(35, 92) : 0, clicks: indexed === "Indexée" ? int(0, 900) : 0,
    lastOptimized: dayOffset(-int(3, 120)), owner: at(OWNERS, i % OWNERS.length),
    title: `${name} | AMBS Agency`, meta: `Découvrez comment AMBS Agency vous accompagne : ${name.toLowerCase()}. Expertise WhatsApp, automatisation et IA.`,
    h1: name, h2: "Pourquoi choisir AMBS ? · Notre méthode · Questions fréquentes", canonical: url,
    internalLinks: int(2, 24), schema: pick(["Organization", "Service", "FAQPage", "Article", "Aucune"]), geoContent: r() > 0.45,
  };
});
seedPages.forEach((p, i) => { if (i % 6 === 3 && p.indexed === "Indexée") p.clicks = 0; });

const DOMAINS = ["journaldunet.com", "frenchweb.fr", "blogdumoderateur.com", "maddyness.com", "e-marketing.fr", "lesechos.fr", "widoobiz.com", "decideo.fr", "annuaire-agences.fr", "sortlist.fr", "clutch.co", "lafrenchtech.com", "bpifrance.fr", "medium.com", "reddit.com", "goodfirms.co", "agence-web-directory.fr", "presse-citron.net", "abondance.com", "ecommercemag.fr"];
export const seedBacklinks: Backlink[] = Array.from({ length: 42 }, (_, i) => {
  const d = at(DOMAINS, i % DOMAINS.length);
  const auth = int(12, 88);
  return {
    id: `bl-${i + 1}`, domain: d, source: `https://${d}/${pick(["article", "dossier", "agences", "guide"])}-${int(100, 999)}`,
    target: at(seedPages.slice(0, 13), 0).url, type: pick(["Dofollow", "Dofollow", "Dofollow", "Nofollow", "Sponsorisé", "UGC"] as const), authority: auth,
    date: dayOffset(-int(1, 360)), status: i % 9 === 4 ? "Perdu" : i % 13 === 6 ? "En attente" : "Actif",
    quality: auth > 70 ? "Excellente" : auth > 50 ? "Bonne" : auth > 30 ? "Moyenne" : "Faible",
  };
});
export const seedMentions: Mention[] = Array.from({ length: 14 }, (_, i) => ({
  id: `mn-${i + 1}`, site: at(DOMAINS, (i * 3) % DOMAINS.length), url: `https://${at(DOMAINS, (i * 3) % DOMAINS.length)}/mention-${int(10, 99)}`,
  type: pick(["Article", "Annuaire", "Podcast", "Forum", "Communiqué"] as const), date: dayOffset(-int(1, 200)), linked: r() > 0.5,
}));

export const seedCompetitors: Competitor[] = COMPETITOR_NAMES.map((n, i) => ({
  id: `cp-${i + 1}`, name: n, site: `${n.toLowerCase().replace(/\s+/g, "-")}.example`,
  commonKeywords: at([118, 94, 76, 61], i), seoVisibility: at([41, 33, 27, 19], i), shareOfVoice: at([24, 19, 15, 11], i),
  geoPresence: at([46, 38, 29, 21], i), aiCitations: at([68, 52, 37, 24], i),
  topTerms: sample(seedKeywords.map((k) => k.term), 4),
}));

const COMPANIES = ["Immo Horizon", "Groupe Védrine", "Atelier Lumen", "Cabinet Ferrand", "AutoPlus Lyon", "Maison Calisto", "FormaPro Sud", "Batir & Co", "Optique Aurore", "Clinique Belair", "Nexa Logistique", "Vinci Courtage", "Hôtel Les Pins", "SportZone", "Agence Delta", "Boulangeries Roux", "Studio Kappa", "Pharma Nord", "Domotik", "Eco Habitat", "Assur Plus", "TechnoServ", "Gîtes de Provence", "Kiné Santé", "Mobilia", "Brasserie Lune", "EduKids", "Garage Central", "Fitlab", "Comptoir Bio", "Lexa Avocats", "Primo Énergie", "Les Jardins d'Ys", "Zenith Voyages", "Galerie Prisme", "Optima RH"];
export const seedLeads: Lead[] = COMPANIES.map((c, i) => {
  const source = at(["SEO", "SEO", "GEO", "Direct", "SEO", "Référent", "GEO", "SEO", "Direct"] as const, i % 9);
  const status = at(["Nouveau", "Qualifié", "Rendez-vous", "Proposition", "Client", "Perdu", "Qualifié", "Rendez-vous", "Nouveau", "Client"] as const, i % 10);
  return {
    id: `ld-${i + 1}`, company: c, source,
    channel: source === "SEO" ? "Google organique" : source === "GEO" ? pick(["ChatGPT", "Perplexity", "Gemini"]) : source === "Direct" ? "Accès direct" : "Site partenaire",
    origin: source === "SEO" || source === "GEO" ? pick(seedPages.slice(1, 25)).name : "—",
    date: dayOffset(-int(1, 85)), status, owner: at(OWNERS, i % OWNERS.length), value: pick([1800, 2400, 3600, 4800, 6000, 9500, 12000]),
  };
});

// 365 days of traffic; last 30 days normalised to 48 250 impressions.
function buildDaily(): DailyPoint[] {
  const pts: DailyPoint[] = [];
  for (let d = 364; d >= 0; d--) {
    const t = (364 - d) / 364;
    const weekday = new Date(TODAY.getTime() - d * 86400000).getUTCDay();
    const wk = weekday === 0 || weekday === 6 ? 0.72 : 1;
    const imp = (700 + 900 * t) * wk * (0.9 + r() * 0.2);
    pts.push({
      date: dayOffset(-d), impressions: imp, clicks: 0,
      firstPage: Math.round(9 + 11 * t + (r() - 0.5) * 2), geo: Math.round((14 + 18 * t + (r() - 0.5) * 4) * 10) / 10,
      position: Math.round((48 - 14 * t + (r() - 0.5) * 3) * 10) / 10, sessions: 0,
    });
  }
  const last30 = pts.slice(-30).reduce((s, p) => s + p.impressions, 0);
  const k = 48250 / last30;
  pts.forEach((p) => {
    p.impressions = Math.round(p.impressions * k);
    p.clicks = Math.round(p.impressions * (0.024 + r() * 0.008));
    p.sessions = Math.round(p.clicks * 1.18);
  });
  const diff = 48250 - pts.slice(-30).reduce((s, p) => s + p.impressions, 0);
  const last = at(pts, pts.length - 1);
  last.impressions += diff;
  return pts;
}
export const daily = buildDaily();

export const ACTIVITIES = [
  { icon: "file", text: "Publication de la page « Agents IA »", who: "Inès Moreau", when: "Il y a 2 h" },
  { icon: "wand", text: "Optimisation de la page solution WhatsApp Business API", who: "Thomas Durand", when: "Il y a 5 h" },
  { icon: "bot", text: "Test de visibilité sur ChatGPT Search (8 prompts)", who: "Sarah Benali", when: "Hier" },
  { icon: "swords", text: "Analyse concurrentielle — Nova Conversations", who: "Karim Haddad", when: "Il y a 2 j" },
  { icon: "link", text: "Nouveau backlink acquis depuis frenchweb.fr", who: "Julie Martin", when: "Il y a 3 j" },
];
