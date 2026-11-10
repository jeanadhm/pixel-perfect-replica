import { BarChart3, Bot, FileText, Gauge, KeyRound, Link2, ListChecks, MessageSquareText, Settings, Swords, TrendingUp, FileBarChart } from "lucide-react";

export const NAV = [
  { group: "Pilotage", items: [
    { title: "Vue générale", url: "/", icon: Gauge },
    { title: "SEO Performance", url: "/seo", icon: TrendingUp },
    { title: "GEO Intelligence", url: "/geo", icon: Bot },
    { title: "Mots-clés", url: "/mots-cles", icon: KeyRound },
    { title: "Prompts IA", url: "/prompts", icon: MessageSquareText },
  ] },
  { group: "Opérations", items: [
    { title: "Actions & Tâches", url: "/actions", icon: ListChecks },
    { title: "Pages & Contenus", url: "/pages", icon: FileText },
    { title: "Autorité & Backlinks", url: "/backlinks", icon: Link2 },
    { title: "Concurrents", url: "/concurrents", icon: Swords },
  ] },
  { group: "Business", items: [
    { title: "Leads & Conversions", url: "/leads", icon: BarChart3 },
    { title: "Rapports", url: "/rapports", icon: FileBarChart },
  ] },
  { group: "Paramètres", items: [{ title: "Paramètres", url: "/parametres", icon: Settings }] },
] as const;
