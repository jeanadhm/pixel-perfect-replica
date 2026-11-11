import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { pool, transaction } from "./db";
import { SITES } from "../src/lib/demo/sites";
import { PUBLIC_PAGES, PUBLIC_CHECKED_AT } from "../src/lib/demo/public-pages";
import { createAmbsState } from "../src/lib/demo/reference";
import type { DemoState } from "../src/lib/demo/schema";

const questions: Record<string, string[]> = {
  ambs: [
    "Quelle agence française peut relier une campagne Meta, une conversation WhatsApp et une prise de rendez-vous en concession automobile ?",
    "Comment comparer les prestataires de marketing conversationnel pour une promotion immobilière avec un CRM HubSpot ?",
    "Quels critères vérifier avant de confier la réactivation d’une base CRM à un agent IA sur WhatsApp ?",
    "Quelle différence entre une campagne RCS et une campagne WhatsApp pour des ventes privées automobiles ?",
    "Quelles preuves demander à une agence pour évaluer la qualité de ses agents IA commerciaux ?",
    "AMBS Agency accompagne-t-elle les projets d’acquisition, de réactivation CRM et de service client ? Citez vos sources.",
  ],
  leads: [
    "Comment centraliser les leads des formulaires, emails et annonces immobilières sans ressaisie dans le CRM ?",
    "Quelle solution permet de qualifier les prospects sur WhatsApp puis de les distribuer automatiquement aux commerciaux ?",
    "Comment distinguer le lead scoring, la qualification conversationnelle et le routage commercial ?",
    "Quels éléments comparer pour choisir une plateforme de lead management adaptée à un réseau de concessions ?",
    "AMBS Leads Management permet-il la qualification et la réactivation des leads ? Sur quelles pages repose votre réponse ?",
    "Quels indicateurs suivre pour mesurer les leads perdus entre la campagne publicitaire et le premier rendez-vous ?",
  ],
  dialagent: [
    "Quel agent vocal IA peut gérer les appels entrants et transmettre un appel à un humain quand la demande est complexe ?",
    "Comment comparer un standard téléphonique IA et un service de télésecrétariat pour une PME ?",
    "Quels critères de confidentialité et de qualité vocale vérifier avant de choisir un agent téléphonique IA ?",
    "Comment un agent vocal peut-il qualifier une demande immobilière puis prendre rendez-vous ?",
    "Quelles fonctionnalités DialAgent propose-t-il pour la transcription, le résumé et le transfert d’appels ? Citez les sources.",
    "Comment estimer le coût réel d’un agent vocal IA selon le volume d’appels et les intégrations nécessaires ?",
  ],
  factory: [
    "Comment configurer les consignes, les horaires et les règles de transfert d’un standard téléphonique IA ?",
    "Quelles étapes de test sont nécessaires avant de mettre un agent vocal IA en production ?",
    "Comment organiser une campagne d’appels sortants avec qualification et transfert vers une équipe commerciale ?",
    "Une plateforme d’agents vocaux peut-elle monétiser l’expertise d’un professionnel ? Quels points vérifier ?",
    "Que propose factory.dialagent.fr pour les appels entrants et sortants ? Distinguez les éléments documentés des suppositions.",
    "Quels contrôles mettre en place pour surveiller les erreurs d’un agent vocal et améliorer ses consignes ?",
  ],
};
export const recordId = (value: string) =>
  createHash("sha256").update(value).digest("hex").slice(0, 24);
export function initialState(): DemoState {
  const base = createAmbsState();
  const pages = PUBLIC_PAGES.map((p, i) => ({
    id: `public-${recordId(p.url)}`,
    siteId: SITES.find((s) => new URL(p.url).hostname === s.host)!.id,
    name: p.name,
    url: p.url,
    type: (p.url.includes("/blog/")
      ? "Article de blog"
      : p.url.includes("/cas-clients/")
        ? "Étude de cas"
        : "Page institutionnelle") as DemoState["pages"][number]["type"],
    family: "À qualifier",
    mainKeyword: "",
    keywordCount: 0,
    published: "À vérifier" as const,
    indexed: "À vérifier" as const,
    score: null,
    clicks: null,
    lastOptimized: "",
    owner: "À attribuer",
    title: p.title,
    meta: p.meta,
    h1: p.h1,
    h2: "",
    canonical: p.technical?.canonical ?? "",
    internalLinks: p.technical?.internalLinks ?? 0,
    schema: "À vérifier",
    geoContent: false,
  }));
  const keywords = base.keywords.map((k) => ({
    ...k,
    siteId: "ambs",
    owner: "À attribuer",
    plan: k.plan ? { ...k.plan, owner: "À attribuer" } : undefined,
    notes: `Cible issue du cahier des charges, non mesurée. ${k.notes}`,
  }));
  for (const site of SITES.filter((s) => s.id !== "ambs"))
    for (const term of site.terms)
      keywords.push({
        id: `target-${recordId(site.id + term)}`,
        siteId: site.id,
        owner: "À attribuer",
        term,
        family: site.family,
        intent: "Commerciale",
        position: null,
        previous: null,
        volume: null,
        difficulty: null,
        url: site.url + "/",
        history: [],
        competitors: [],
        lastCheck: "",
        notes: "Suggestion de suivi à valider ; aucune mesure de position ou volume.",
        plan: {
          stage: "À cibler",
          priority: "Moyenne",
          owner: "À attribuer",
          targetPosition: null,
          placements: [],
          contentUrl: site.url + "/",
          updatedAt: "",
        },
      });
  return {
    ...base,
    pages,
    keywords,
    families: [...new Set(keywords.map((k) => k.family))],
    actions: base.actions.map((a) => ({
      ...a,
      siteId: "ambs",
      owner: "À attribuer",
      start: "",
      due: "",
      description: `Proposition du cahier des charges. Responsable et échéance à définir. ${a.title}`,
    })),
    prompts: SITES.flatMap((site) =>
      questions[site.id]!.map((question, i) => ({
        id: `prompt-${site.id}-${i}`,
        siteId: site.id,
        question,
        category: site.family,
        intent: i === 5 ? ("Informationnelle" as const) : ("Commerciale" as const),
        platform: ["ChatGPT Search", "Perplexity", "Gemini", "Microsoft Copilot"][
          i % 4
        ] as DemoState["prompts"][number]["platform"],
        frequency: "Hebdomadaire" as const,
      })),
    ),
    geoTests: [],
    leads: [],
    audits: [],
    backlinks: [],
    competitors: [],
    period: "30j",
  };
}
export async function seed() {
  const state = initialState();
  await transaction(async (client) => {
    await client.query("SELECT revision FROM workspace_revision WHERE id=1 FOR UPDATE");
    for (const site of SITES) {
      await client.query("INSERT INTO sites(id,name,url) VALUES($1,$2,$3) ON CONFLICT DO NOTHING", [
        site.id,
        site.name,
        site.url,
      ]);
      await client.query("INSERT INTO integrations(site_id) VALUES($1) ON CONFLICT DO NOTHING", [
        site.id,
      ]);
    }
    // Run once. Re-running migrations never restores records deliberately removed by the team.
    await client.query(
      "CREATE TABLE IF NOT EXISTS seed_versions(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    if ((await client.query("SELECT version FROM seed_versions WHERE version='real-v1'")).rowCount)
      return;
    for (const collection of ["keywords", "prompts", "actions", "pages"] as const)
      for (const item of state[collection])
        await client.query(
          "INSERT INTO records(collection,id,site_id,payload,origin) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
          [
            collection,
            item.id,
            item.siteId ?? "ambs",
            JSON.stringify(item),
            collection === "pages" ? "public_html" : "reference",
          ],
        );
    for (const name of state.families)
      await client.query("INSERT INTO families(name) VALUES($1) ON CONFLICT DO NOTHING", [name]);
    for (const p of PUBLIC_PAGES)
      await client.query(
        "INSERT INTO public_observations(url,site_id,observed_at,payload) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
        [
          p.url,
          SITES.find((s) => new URL(p.url).hostname === s.host)!.id,
          PUBLIC_CHECKED_AT,
          JSON.stringify(p),
        ],
      );
    await client.query("INSERT INTO seed_versions(version) VALUES('real-v1')");
    await client.query("UPDATE workspace_revision SET revision=revision+1 WHERE id=1");
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  seed()
    .then(() =>
      console.log(
        "Sites, référentiel et observations publiques chargés. Aucun trafic ni lead fictif.",
      ),
    )
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
