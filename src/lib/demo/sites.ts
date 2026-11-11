export const SITES = [
  {
    id: "ambs",
    name: "AMBS Agency",
    url: "https://ambs-agency.com",
    host: "ambs-agency.com",
    role: "Site principal",
    focus: "Agents IA, acquisition et automatisation métier",
    family: "Marketing conversationnel",
    terms: [
      "agence IA conversationnelle",
      "marketing conversationnel",
      "agent IA automobile",
      "automatisation immobilier",
      "réactivation CRM",
      "campagne RCS",
      "agence WhatsApp marketing",
      "business automation",
    ],
    opportunity:
      "Relier les cas clients aux solutions et aux pages métiers, puis renforcer les réponses aux questions d’achat.",
  },
  {
    id: "leads",
    name: "AMBS Leads Management",
    url: "https://leads.ambs-agency.com",
    host: "leads.ambs-agency.com",
    role: "Solution commerciale",
    focus: "Capture, qualification, scoring, routage et réactivation des leads",
    family: "Lead Management",
    terms: [
      "lead management IA",
      "qualification leads WhatsApp",
      "lead scoring automatique",
      "routage commercial CRM",
      "réactivation prospects",
      "gestion leads immobiliers",
      "automatisation leads automobiles",
      "intégration WhatsApp HubSpot",
    ],
    opportunity:
      "Développer les intentions qualification, scoring et intégration CRM ; relier chaque bénéfice à un parcours de démonstration.",
  },
  {
    id: "dialagent",
    name: "DialAgent",
    url: "https://dialagent.fr",
    host: "dialagent.fr",
    role: "Site produit",
    focus: "Agents vocaux IA, appels entrants et sortants, rendez-vous",
    family: "Agents vocaux",
    terms: [
      "agent vocal IA",
      "standard téléphonique IA",
      "automatisation appels entrants",
      "agent IA prise de rendez-vous",
      "qualification téléphonique IA",
      "agent vocal immobilier",
      "assistant vocal automobile",
      "prix agent vocal IA",
    ],
    opportunity:
      "Travailler les requêtes vocales par métier, les tarifs et les comparatifs, avec des réponses courtes et citables.",
  },
  {
    id: "factory",
    name: "DialAgent Factory",
    url: "https://factory.dialagent.fr",
    host: "factory.dialagent.fr",
    role: "Plateforme produit",
    focus: "Création et configuration d’agents vocaux IA",
    family: "Plateforme vocale",
    terms: [
      "créer agent vocal IA",
      "configuration DialAgent",
      "plateforme agents vocaux",
      "assistant téléphonique no code",
      "connexion DialAgent",
      "intégration téléphonie IA",
      "déployer agent vocal",
      "documentation DialAgent",
    ],
    opportunity:
      "Distinguer les pages publiques à référencer des écrans de connexion et de gestion à garder hors indexation.",
  },
] as const;
export type SiteId = (typeof SITES)[number]["id"];
export type SiteScope = SiteId | "all";
export const siteForUrl = (url: string) => {
  try {
    const host = new URL(url.includes("://") ? url : `https://${url}`).hostname.replace(
      /^www\./,
      "",
    );
    return SITES.find((s) => s.host === host);
  } catch {
    return undefined;
  }
};
export const siteLabel = (id: string) => SITES.find((s) => s.id === id)?.name ?? "Tous les sites";
