export type Intent = "Informationnelle" | "Commerciale" | "Transactionnelle";
export type KwStatus = "Visible" | "Faible visibilité" | "Invisible";

export interface Keyword {
  id: string;
  term: string;
  family: string;
  intent: Intent;
  position: number | null;
  previous: number | null;
  volume: number;
  difficulty: number;
  url: string;
  history: { week: string; position: number | null }[];
  competitors: { name: string; position: number }[];
  lastCheck: string;
  notes: string;
}

export type Platform = "ChatGPT Search" | "Google AI Overviews" | "Microsoft Copilot" | "Perplexity" | "Gemini";
export type GeoStatus = "Mentionnée et recommandée" | "Mentionnée sans recommandation" | "Non mentionnée" | "Réponse incorrecte";

export interface GeoPrompt {
  id: string;
  question: string;
  category: string;
  intent: Intent;
  platform: Platform;
  frequency: "Hebdomadaire" | "Bimensuelle" | "Mensuelle";
}

export interface GeoTest {
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
}

export type ActionStatus = "À faire" | "En cours" | "En attente" | "Terminé" | "Bloqué";
export type Priority = "Critique" | "Haute" | "Moyenne" | "Basse";

export interface Action {
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
}

export type PageType = "Page solution" | "Page secteur" | "Étude de cas" | "Article de blog" | "Page institutionnelle";

export interface SitePage {
  id: string;
  name: string;
  url: string;
  type: PageType;
  family: string;
  mainKeyword: string;
  keywordCount: number;
  published: "Publiée" | "Brouillon" | "À créer";
  indexed: "Indexée" | "Non indexée" | "En attente";
  score: number;
  clicks: number;
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
  id: string;
  domain: string;
  source: string;
  target: string;
  type: "Dofollow" | "Nofollow" | "Sponsorisé" | "UGC";
  authority: number;
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
  id: string;
  name: string;
  site: string;
  commonKeywords: number;
  seoVisibility: number;
  shareOfVoice: number;
  geoPresence: number;
  aiCitations: number;
  topTerms: string[];
}

export interface Lead {
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
