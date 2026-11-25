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
      "alternative Sandra AI concession automobile",
      "agent vocal IA automobile",
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
    id: "lp",
    name: "AMBS · Lead Management Immobilier",
    url: "https://lp.ambs-agency.com",
    host: "lp.ambs-agency.com",
    role: "Landing page métier",
    focus: "Lead management immobilier et traitement des réponses aux annonces",
    family: "Lead Management immobilier",
    terms: [
      "lead management immobilier",
      "qualification leads immobiliers",
      "réponse annonces immobilières",
      "automatisation leads immobilier",
    ],
    opportunity:
      "Documenter le parcours de traitement des réponses et relier la landing page aux preuves, cas clients et demandes de démonstration.",
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
  {
    id: "pautric",
    name: "Groupe Pautric · Espace Leads",
    url: "https://pautric.ambs-ia.com",
    host: "pautric.ambs-ia.com",
    role: "Espace client automobile",
    focus: "Suivi commercial et traitement des leads du Groupe Pautric",
    family: "Automobile",
    terms: [
      "gestion leads automobile",
      "qualification prospects concession",
      "suivi commercial automobile",
      "relance prospects automobile",
    ],
    opportunity:
      "Séparer les pages publiques à documenter des écrans client privés, puis relier les parcours de conversion automobile aux sources mesurées.",
  },
  {
    id: "trefle",
    name: "Le Trèfle",
    url: "https://trefle.offres-privileges.com",
    host: "trefle.offres-privileges.com",
    role: "Site établissement",
    focus: "Bureaux et coworking à Boulogne-Billancourt",
    family: "Bureaux & coworking",
    terms: [
      "coworking Boulogne-Billancourt",
      "bureaux Boulogne-Billancourt",
      "location bureau Boulogne",
      "espace coworking Boulogne",
    ],
    opportunity:
      "Consolider les pages d’offre, l’accès, les contacts et les preuves locales pour répondre aux recherches de bureaux et coworking.",
  },
  {
    id: "outreach",
    name: "AMBS Outreach",
    url: "https://war.ambs-agency.com",
    host: "war.ambs-agency.com",
    role: "Outil d’outreach",
    focus: "Prospection et campagnes sortantes AMBS",
    family: "Outreach",
    terms: [
      "automatisation prospection",
      "campagne outreach B2B",
      "prospection conversationnelle",
      "relance commerciale automatisée",
    ],
    opportunity:
      "Déterminer les pages réellement destinées à l’indexation et garder les parcours de travail internes exclus du suivi public.",
  },
  {
    id: "walink",
    name: "AMBS WaLink",
    url: "https://walink.ambs-agency.com",
    host: "walink.ambs-agency.com",
    role: "Outil WhatsApp",
    focus: "Génération de liens WhatsApp et de QR codes",
    family: "WhatsApp",
    terms: [
      "générateur lien WhatsApp",
      "QR code WhatsApp",
      "lien WhatsApp entreprise",
      "créer lien WhatsApp",
    ],
    opportunity:
      "Clarifier la valeur publique de l’outil, ses cas d’usage et ses limites, puis enrichir les pages indexables avec des réponses pratiques.",
  },
] as const;

// AMBS Outreach remains in the public SEO/GEO inventory, but is deliberately excluded
// from Google data imports: it is an internal outreach surface, not a reporting property.
export const GOOGLE_SITES = SITES.filter((site) => site.id !== "outreach");

/**
 * The account is validated with URL-prefix properties, one for each public
 * host. This does not require DNS access and keeps the data boundary explicit.
 */
export const googleSearchPropertyForSite = (siteId: string) => {
  const site = GOOGLE_SITES.find((candidate) => candidate.id === siteId);
  return site ? `https://${site.host}/` : null;
};

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
