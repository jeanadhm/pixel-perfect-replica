import { createApp } from "./app";
import { config } from "./config";
import { pool } from "./db";
import { migrate } from "./migrate";
import { seed } from "./seed";
import { synchronizeGoogleNow } from "./google";
import { probeAllCompetitors } from "./competitors";
import { discoverCompetitors, dataForSeoConfigured } from "./dataforseo";
import { discoverFreeCompetitors, freeCompetitorDiscoveryConfigured } from "./free-competitors";
import { reconcileAutomaticActions } from "./automation";
import { crawlDueSites } from "./site-crawler";
import { syncConfiguredSiteEvents } from "./site-events";
import { SITES } from "../src/lib/demo/sites";
if (!config.databaseUrl)
  throw new Error("DATABASE_URL manquant. Exécuter npm run db:local ou configurer .env.");
await migrate();
await seed();
// An interrupted process cannot retain an indefinite running job.
await pool.query(
  "UPDATE sync_runs SET status='error',finished_at=now(),message='Processus interrompu avant confirmation.' WHERE status='running' AND started_at<now()-interval '15 minutes'",
);
const server = createApp().listen(config.port, config.host, () =>
  console.log(`API AMBS : http://${config.host}:${config.port} · PostgreSQL connecté`),
);
let googleAutomation: ReturnType<typeof setInterval> | undefined;
let monitoringAutomation: ReturnType<typeof setInterval> | undefined;
let eventAutomation: ReturnType<typeof setInterval> | undefined;
let competitorDiscoveryAutomation: ReturnType<typeof setInterval> | undefined;
let freeCompetitorDiscoveryAutomation: ReturnType<typeof setInterval> | undefined;
if (config.autoSyncEnabled) {
  let syncing = false;
  const runGoogleSynchronization = async () => {
    if (syncing) return;
    syncing = true;
    try {
      try {
        const result = await synchronizeGoogleNow();
        if (result.completed || result.failed)
          console.log(
            `Synchronisation Google auto : ${result.completed} réussie(s), ${result.failed} échec(s).`,
          );
      } catch {
        // A temporary Google failure must not suspend public competitor checks.
        console.error("Synchronisation Google automatique non exécutée.");
      }
    } catch {
      // The scheduler must remain available after an unexpected programming/runtime error.
      console.error("Automatisation de visibilité interrompue.");
    } finally {
      syncing = false;
    }
  };
  const initial = setTimeout(() => void runGoogleSynchronization(), 15000);
  initial.unref();
  googleAutomation = setInterval(
    () => void runGoogleSynchronization(),
    config.autoSyncIntervalMinutes * 60 * 1000,
  );
  googleAutomation.unref();
}
if (config.autoEventSyncEnabled) {
  let syncingEvents = false;
  const runEventSynchronization = async () => {
    if (syncingEvents) return;
    syncingEvents = true;
    try {
      const result = await syncConfiguredSiteEvents();
      if (result.configured) console.log(`Interactions : ${result.completed} flux synchronisé(s), ${result.failed} échec(s).`);
    } catch {
      console.error("Synchronisation des interactions non exécutée.");
    } finally {
      syncingEvents = false;
    }
  };
  const initial = setTimeout(() => void runEventSynchronization(), 20000);
  initial.unref();
  eventAutomation = setInterval(() => void runEventSynchronization(), config.autoEventSyncIntervalMinutes * 60 * 1000);
  eventAutomation.unref();
}
if (config.autoCompetitorDiscoveryEnabled && dataForSeoConfigured()) {
  let discovering = false;
  const runCompetitorDiscovery = async () => {
    if (discovering) return;
    discovering = true;
    try {
      // DataForSEO is a paid source: scheduled discovery is intentionally weekly
      // and records its source on every competitor. Manual discovery stays available.
      await Promise.allSettled(SITES.map((site) => discoverCompetitors(site.id)));
    } catch {
      console.error("Découverte concurrentielle automatique non exécutée.");
    } finally {
      discovering = false;
    }
  };
  const initial = setTimeout(() => void runCompetitorDiscovery(), 45000);
  initial.unref();
  competitorDiscoveryAutomation = setInterval(() => void runCompetitorDiscovery(), config.autoCompetitorDiscoveryIntervalHours * 60 * 60 * 1000);
  competitorDiscoveryAutomation.unref();
}
if (freeCompetitorDiscoveryConfigured()) {
  let discoveringFree = false;
  const runFreeCompetitorDiscovery = async () => {
    if (discoveringFree) return;
    discoveringFree = true;
    try {
      const outcomes = await Promise.allSettled(SITES.map((site) => discoverFreeCompetitors(site.id)));
      const completed = outcomes.filter((outcome) => outcome.status === "fulfilled").length;
      console.log(`Découverte concurrentielle gratuite : ${completed}/${SITES.length} site(s) analysé(s).`);
    } catch {
      console.error("Découverte concurrentielle gratuite non exécutée.");
    } finally {
      discoveringFree = false;
    }
  };
  const initial = setTimeout(() => void runFreeCompetitorDiscovery(), 60000);
  initial.unref();
  freeCompetitorDiscoveryAutomation = setInterval(
    () => void runFreeCompetitorDiscovery(),
    config.freeCompetitorDiscoveryIntervalHours * 60 * 60 * 1000,
  );
  freeCompetitorDiscoveryAutomation.unref();
}
if (config.autoMonitoringEnabled) {
  let monitoring = false;
  const runPublicMonitoring = async () => {
    if (monitoring) return;
    monitoring = true;
    try {
      try {
        const competitors = await probeAllCompetitors();
        if (competitors.length)
          console.log(`Surveillance concurrentielle : ${competitors.length} site(s) relevé(s).`);
      } catch {
        console.error("Surveillance concurrentielle automatique non exécutée.");
      }
      try {
        const crawls = await crawlDueSites();
        if (crawls.length)
          console.log(
            `Crawl sitemap : ${crawls.reduce((sum, crawl) => sum + crawl.completed, 0)} page(s) relevée(s).`,
          );
      } catch {
        console.error("Crawl sitemap automatique non exécuté.");
      }
      const actions = await reconcileAutomaticActions();
      if (actions.created || actions.restored || actions.resolved)
        console.log(
          `Tâches automatiques : ${actions.active} active(s), ${actions.created} créée(s), ${actions.resolved} résolue(s).`,
        );
    } catch {
      console.error("Surveillance publique automatique interrompue.");
    } finally {
      monitoring = false;
    }
  };
  const initial = setTimeout(() => void runPublicMonitoring(), 25000);
  initial.unref();
  monitoringAutomation = setInterval(
    () => void runPublicMonitoring(),
    config.autoMonitoringIntervalMinutes * 60 * 1000,
  );
  monitoringAutomation.unref();
}
async function stop() {
  if (googleAutomation) clearInterval(googleAutomation);
  if (monitoringAutomation) clearInterval(monitoringAutomation);
  if (eventAutomation) clearInterval(eventAutomation);
  if (competitorDiscoveryAutomation) clearInterval(competitorDiscoveryAutomation);
  if (freeCompetitorDiscoveryAutomation) clearInterval(freeCompetitorDiscoveryAutomation);
  server.close();
  await pool.end();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
