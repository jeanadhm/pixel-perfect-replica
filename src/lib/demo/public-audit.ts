export interface PublicPage {
  url: string;
  finalUrl: string;
  status: number;
  title: string;
  h1: string;
  name: string;
  meta: string;
  source: string;
  observedAt?: string;
  technical:
    | {
        meta: string;
        canonical: string;
        robots: string;
        h1Count: number;
        h2Count: number;
        imageCount: number;
        missingAltCount: number;
        internalLinks: number;
        schemaBlocks: number;
        wordCount: number;
      }
    | null;
}
export function publicFindings(page: PublicPage): string[] {
  if (page.status !== 200)
    return [`Réponse HTTP ${page.status || "non obtenue"} : vérifier le lien ou la redirection.`];
  const t = page.technical;
  if (!t) return ["Relevé technique indisponible."];
  const findings: string[] = [];
  if (!t.meta) findings.push("Meta description absente du HTML initial.");
  if (t.h1Count !== 1)
    findings.push(
      `${t.h1Count} H1 dans le HTML initial : contrôler le titre principal après rendu.`,
    );
  if (!t.canonical)
    findings.push("Canonique absente du HTML initial : vérifier l’URL de référence.");
  if (t.missingAltCount)
    findings.push(`${t.missingAltCount} image(s) sans attribut alt : contrôler leur rôle.`);
  if (!t.schemaBlocks)
    findings.push(
      "Aucun bloc JSON-LD dans le HTML initial : étudier les données structurées pertinentes.",
    );
  if (/noindex/i.test(t.robots))
    findings.push("Directive noindex déclarée : vérifier si elle est intentionnelle.");
  return findings;
}
