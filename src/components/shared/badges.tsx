import { Badge } from "@/components/ui/badge";
import type { ActionStatus, GeoStatus, KwStatus, Priority } from "@/lib/demo/types";

type V = "success" | "danger" | "warning" | "info" | "geo" | "muted";
const KW: Record<KwStatus, V> = {
  "À mesurer": "muted",
  Visible: "success",
  "Faible visibilité": "warning",
  Invisible: "danger",
};
const GEO: Record<GeoStatus, V> = {
  "Mentionnée et recommandée": "success",
  "Mentionnée sans recommandation": "geo",
  "Non mentionnée": "muted",
  "Réponse incorrecte": "danger",
};
const ACT: Record<ActionStatus, V> = {
  "À faire": "muted",
  "En cours": "info",
  "En attente": "warning",
  Terminé: "success",
  Bloqué: "danger",
};
const PRI: Record<Priority, V> = {
  Critique: "danger",
  Haute: "warning",
  Moyenne: "info",
  Basse: "muted",
};

export const KwBadge = ({ s }: { s: KwStatus }) => <Badge variant={KW[s]}>{s}</Badge>;
export const GeoBadge = ({ s }: { s: GeoStatus }) => (
  <Badge variant={GEO[s]} className="whitespace-nowrap">
    {s}
  </Badge>
);
export const ActBadge = ({ s }: { s: ActionStatus }) => <Badge variant={ACT[s]}>{s}</Badge>;
export const PriBadge = ({ s }: { s: Priority }) => <Badge variant={PRI[s]}>{s}</Badge>;
export const ToneBadge = ({ v, children }: { v: V; children: React.ReactNode }) => (
  <Badge variant={v}>{children}</Badge>
);
