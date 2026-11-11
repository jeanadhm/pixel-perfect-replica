import { createFileRoute } from "@tanstack/react-router";
import { PortfolioOverview } from "@/components/portfolio/PortfolioOverview";
import { pageHead } from "@/lib/head";
export const Route = createFileRoute("/")({
  head: pageHead(
    "Vue d’ensemble",
    "Pilotage SEO et GEO des sites AMBS, Leads, DialAgent et Factory.",
  ),
  component: PortfolioOverview,
});
