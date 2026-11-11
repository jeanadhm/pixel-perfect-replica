import type { LucideIcon } from "lucide-react";
import {
  PlugZap,
  Globe2,
  BarChart3,
  Bot,
  FileText,
  Gauge,
  KeyRound,
  Link2,
  ListChecks,
  MessageSquareText,
  Settings,
  Swords,
  TrendingUp,
  FileBarChart,
} from "lucide-react";

export interface NavItem {
  title: string;
  /** Next.js route path (see src/app). */
  url: string;
  icon: LucideIcon;
}
export interface NavGroup {
  group: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    group: "Pilotage",
    items: [
      { title: "Vue d’ensemble", url: "/", icon: Gauge },
      { title: "Sites & Liens", url: "/sites", icon: Globe2 },
      { title: "SEO Performance", url: "/seo", icon: TrendingUp },
      { title: "GEO Intelligence", url: "/geo", icon: Bot },
      { title: "Mots-clés", url: "/mots-cles", icon: KeyRound },
      { title: "Prompts IA", url: "/prompts", icon: MessageSquareText },
    ],
  },
  {
    group: "Opérations",
    items: [
      { title: "Actions & Tâches", url: "/actions", icon: ListChecks },
      { title: "Pages & Contenus", url: "/pages", icon: FileText },
      { title: "Audit SEO & GEO", url: "/audit", icon: ListChecks },
      { title: "Autorité & Backlinks", url: "/backlinks", icon: Link2 },
      { title: "Concurrents", url: "/concurrents", icon: Swords },
    ],
  },
  {
    group: "Business",
    items: [
      { title: "Leads & Conversions", url: "/leads", icon: BarChart3 },
      { title: "Rapports", url: "/rapports", icon: FileBarChart },
    ],
  },
  {
    group: "Équipe & données",
    items: [
      { title: "Connexions", url: "/connexions", icon: PlugZap },
      { title: "Équipe & paramètres", url: "/parametres", icon: Settings },
    ],
  },
];
