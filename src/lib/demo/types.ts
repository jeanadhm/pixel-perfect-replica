export type Intent = "Informationnelle" | "Commerciale" | "Transactionnelle";
export type KwStatus = "Visible" | "Faible visibilité" | "Invisible" | "À mesurer";

export interface KeywordPlan {
  stage:
    | "À qualifier"
    | "À cibler"
    | "À intégrer"
    | "Intégré"
    | "À optimiser"
    | "À surveiller"
    | "Archivé";
  priority: Priority;
  owner: string;
  targetPosition: number | null;
  placements: string[];
  contentUrl: string;
  updatedAt: string;
}
export interface KeywordMeasurement {
  startDate?: string | undefined;
  endDate?: string | undefined;
  id: string;
  date: string;
  position: number | null;
  impressions: number;
  clicks: number;
  source: string;
  notes: string;
}
export interface Keyword {
  siteId?: string | undefined;
  id: string;
  term: string;
  family: string;
  intent: Intent;
  position: number | null;
  previous: number | null;
  volume: number | null;
  difficulty: number | null;
  url: string;
  history: { week: string; position: number | null }[];
  competitors: { name: string; position: number }[];
  lastCheck: string;
  notes: string;
  plan?: KeywordPlan | undefined;
  measurements?: KeywordMeasurement[] | undefined;
}

export type Platform =
  "ChatGPT Search" | "Google AI Overviews" | "Microsoft Copilot" | "Perplexity" | "Gemini";
export type GeoStatus =
  | "Mentionnée et recommandée"
  | "Mentionnée sans recommandation"
  | "Non mentionnée"
  | "Réponse incorrecte";

export interface GeoPrompt {
  siteId?: string | undefined;
  id: string;
  question: string;
  category: string;
  intent: Intent;
  platform: Platform;
  frequency: "Hebdomadaire" | "Bimensuelle" | "Mensuelle";
}

export interface GeoTest {
  siteId?: string | undefined;
  id: string;
  promptId: string;
  date: string;
  platform: Platform;
  question: string;
  mentioned: boolean;
  recommended: boolean;
  accuracy: "Exacte" | "Partielle" | "Incorrecte" | "—";
  mentionPosition: number | null;
  competitors: string[];
  sources: string[];
  status: GeoStatus;
  response: string;
  origin?: "Simulation" | "Saisie manuelle" | undefined;
  evidenceUrl?: string | undefined;
}

export type ActionStatus = "À faire" | "En cours" | "En attente" | "Terminé" | "Bloqué";
export type Priority = "Critique" | "Haute" | "Moyenne" | "Basse";

export interface Action {
  siteId?: string | undefined;
  id: string;
  title: string;
  description: string;
  category: "SEO" | "GEO";
  priority: Priority;
  owner: string;
  start: string;
  due: string;
  status: ActionStatus;
  target: string;
  deliverable: string;
  kpi: string;
  comments: string;
  recurrence?:
    "Ponctuelle" | "Hebdomadaire" | "Bimensuelle" | "Mensuelle" | "Trimestrielle" | undefined;
  parentActionId?: string | undefined;
  keywordId?: string | undefined;
  promptId?: string | undefined;
  pageId?: string | undefined;
  baseline?: number | null | undefined;
  goal?: number | null | undefined;
  result?: number | null | undefined;
  metricUnit?: string | undefined;
  proofUrl?: string | undefined;
}

export type PageType =
  "Page solution" | "Page secteur" | "Étude de cas" | "Article de blog" | "Page institutionnelle";

export interface SitePage {
  siteId?: string | undefined;
  id: string;
  name: string;
  url: string;
  type: PageType;
  family: string;
  mainKeyword: string;
  keywordCount: number;
  published: "Publiée" | "Brouillon" | "À créer" | "À vérifier";
  indexed: "Indexée" | "Non indexée" | "En attente" | "À vérifier";
  score: number | null;
  clicks: number | null;
  lastOptimized: string;
  owner: string;
  title: string;
  meta: string;
  h1: string;
  h2: string;
  canonical: string;
  internalLinks: number;
  schema: string;
  geoContent: boolean;
}

export interface Backlink {
  siteId?: string | undefined;
  id: string;
  domain: string;
  source: string;
  target: string;
  type: "Dofollow" | "Nofollow" | "Sponsorisé" | "UGC";
  authority: number | null;
  date: string;
  status: "Actif" | "Perdu" | "En attente";
  quality: "Excellente" | "Bonne" | "Moyenne" | "Faible";
}

export interface Mention {
  id: string;
  site: string;
  url: string;
  type: "Article" | "Annuaire" | "Podcast" | "Forum" | "Communiqué";
  date: string;
  linked: boolean;
}

export interface Competitor {
  siteId?: string | undefined;
  id: string;
  name: string;
  site: string;
  commonKeywords: number | null;
  seoVisibility: number | null;
  shareOfVoice: number | null;
  geoPresence: number | null;
  aiCitations: number | null;
  topTerms: string[];
}

export interface Lead {
  sourceSystem?: string | undefined;
  sourceRecordId?: string | undefined;
  evidenceUrl?: string | undefined;
  attributionEvidence?: string | undefined;
  importedAt?: string | undefined;
  siteId?: string | undefined;
  id: string;
  company: string;
  source: "SEO" | "GEO" | "Direct" | "Référent";
  channel: string;
  origin: string;
  date: string;
  status: "Nouveau" | "Qualifié" | "Rendez-vous" | "Proposition" | "Client" | "Perdu";
  owner: string;
  value: number;
}

export interface DailyPoint {
  date: string;
  impressions: number;
  clicks: number;
  firstPage: number;
  geo: number;
  position: number;
  sessions: number;
}
