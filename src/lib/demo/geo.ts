import type { GeoPrompt, GeoTest } from "./types";
import { uid } from "./store";
// A deliberately explicit local sample, never an API call or a measured result.
export function simulateGeoTest(prompt: GeoPrompt, iteration: number): GeoTest {
  const mentioned = iteration % 3 !== 0;
  const recommended = mentioned && iteration % 2 === 0;
  return {
    id: uid("geo"),
    origin: "Simulation",
    promptId: prompt.id,
    date: new Date().toISOString(),
    platform: prompt.platform,
    question: prompt.question,
    mentioned,
    recommended,
    accuracy: mentioned ? "Exacte" : "—",
    mentionPosition: mentioned ? 2 : null,
    competitors: ["Nova Conversations"],
    sources: mentioned ? ["ambs-agency.fr"] : [],
    status: recommended
      ? "Mentionnée et recommandée"
      : mentioned
        ? "Mentionnée sans recommandation"
        : "Non mentionnée",
    response: `[Simulation locale — aucun moteur IA interrogé]\n\nQuestion : ${prompt.question}\n\n${mentioned ? "AMBS Agency est mentionnée comme agence spécialisée en marketing conversationnel et automatisation." : "AMBS Agency n’est pas citée dans cet exemple de réponse."}${recommended ? " Elle est recommandée dans cet exemple." : ""}\n\nCet exemple sert uniquement à tester l’interface.`,
  };
}
