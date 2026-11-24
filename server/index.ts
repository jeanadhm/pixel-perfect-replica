import { createApp } from "./app";
import { config } from "./config";
import { pool } from "./db";
import { migrate } from "./migrate";
import { seed } from "./seed";
import { synchronizeGoogleNow } from "./google";
import { probeAllCompetitors } from "./competitors";
import { reconcileAutomaticActions } from "./automation";
import { crawlDueSites } from "./site-crawler";
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
let automation: ReturnType<typeof setInterval> | undefined;
if (config.autoSyncEnabled) {
  let syncing = false;
  const runAutomation = async () => {
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
        // A sitemap that is unavailable must never prevent the rest of the visibility pipeline.
        console.error("Crawl sitemap automatique non exécuté.");
      }
      const actions = await reconcileAutomaticActions();
      if (actions.created || actions.restored || actions.resolved)
        console.log(
          `Tâches automatiques : ${actions.active} active(s), ${actions.created} créée(s), ${actions.resolved} résolue(s).`,
        );
    } catch {
      // The scheduler must remain available after an unexpected programming/runtime error.
      console.error("Automatisation de visibilité interrompue.");
    } finally {
      syncing = false;
    }
  };
  const initial = setTimeout(() => void runAutomation(), 15000);
  initial.unref();
  automation = setInterval(() => void runAutomation(), config.autoSyncIntervalMinutes * 60 * 1000);
  automation.unref();
}
async function stop() {
  if (automation) clearInterval(automation);
  server.close();
  await pool.end();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
